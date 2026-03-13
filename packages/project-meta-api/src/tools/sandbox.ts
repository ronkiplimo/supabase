import { Sandbox } from '@vercel/sandbox'
import { Writable } from 'stream'
import { tool } from 'ai'
import { z } from 'zod'
import { getToolContext } from './context.js'
import { PROJECT_REF } from '../db.js'

const PORT = process.env.PORT ?? 3001
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''

const CHAT_POST_MAX_CHARS = 24_000
const CHAT_POST_MAX_ATTEMPTS = 4
const CHAT_POST_TIMEOUT_MS = 180_000
const SANDBOX_OUTPUT_BUFFER_CHARS = 160_000
const SUMMARY_TAG_REGEX = /<summary>([\s\S]*?)<\/summary>/gi
const DEFAULT_WRITE_BRANCH_PREFIX = 'pa'
const SANDBOX_TIMEOUT_MS = 35 * 60 * 1000

function truncate(input: string, maxChars = CHAT_POST_MAX_CHARS): string {
  if (input.length <= maxChars) return input
  const head = Math.floor(maxChars * 0.7)
  const tail = maxChars - head
  return `${input.slice(0, head)}\n\n...[truncated ${input.length - head - tail} chars]...\n\n${input.slice(-tail)}`
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)) }

function lastLine(s: string): string {
  return s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).at(-1) ?? ''
}

function createOutputCollector(maxChars = SANDBOX_OUTPUT_BUFFER_CHARS) {
  const chunks: string[] = []
  let currentChars = 0
  let truncatedChars = 0
  return {
    append(chunk: string) {
      if (!chunk) return
      chunks.push(chunk)
      currentChars += chunk.length
      while (currentChars > maxChars && chunks.length > 0) {
        const removed = chunks.shift()!
        currentChars -= removed.length
        truncatedChars += removed.length
      }
    },
    getText() {
      const body = chunks.join('')
      return truncatedChars > 0 ? `[truncated: omitted ${truncatedChars} chars]\n${body}` : body
    },
  }
}

function extractSummary(output: string): string | null {
  let match: RegExpExecArray | null
  let last: string | null = null
  SUMMARY_TAG_REGEX.lastIndex = 0
  while ((match = SUMMARY_TAG_REGEX.exec(output)) !== null) {
    const c = match[1]?.trim()
    if (c) last = c
  }
  SUMMARY_TAG_REGEX.lastIndex = 0
  return last
}

function shellQuote(v: string): string { return `'${v.replace(/'/g, `'\"'\"'`)}'` }

function createDefaultBranchName(): string {
  return `${DEFAULT_WRITE_BRANCH_PREFIX}/${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`
}

async function runCommand(sandbox: any, cmd: string): Promise<{ output: string; exitCode: number }> {
  const r = await sandbox.runCommand('bash', ['-c', `${cmd} 2>&1`])
  const output = (await r.stdout() as string).trim()
  return { output, exitCode: (r.exitCode as number) ?? -1 }
}

function parseGitHubRepo(repoUrl: string): { owner: string; repo: string } | null {
  const ssh = repoUrl.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i)
  if (ssh) return { owner: ssh[1], repo: ssh[2] }
  try {
    const u = new URL(repoUrl)
    if (u.hostname.toLowerCase() !== 'github.com') return null
    const parts = u.pathname.replace(/^\/+/, '').replace(/\.git$/, '').split('/')
    return parts.length >= 2 ? { owner: parts[0], repo: parts[1] } : null
  } catch { return null }
}

async function pushBranch(sandbox: any, branch: string, githubToken: string) {
  if (githubToken) {
    const { output: remoteUrl } = await runCommand(sandbox, 'git remote get-url origin')
    if (remoteUrl && !remoteUrl.includes('@github.com')) {
      const authedUrl = remoteUrl.replace('https://', `https://x-access-token:${githubToken}@`)
      await runCommand(sandbox, `git remote set-url origin ${shellQuote(authedUrl)}`)
    }
  }
  const r = await runCommand(sandbox, `git push --set-upstream origin ${shellQuote(branch)}`)
  return r.exitCode !== 0
    ? { ok: false, message: `Push failed for branch \`${branch}\`: ${r.output}` }
    : { ok: true, message: `Push succeeded for branch \`${branch}\`` }
}

async function createPR(owner: string, repo: string, head: string, base: string, title: string, body: string, token: string) {
  if (!token) return { ok: false, message: 'No GitHub token — PR creation skipped.' }
  const path = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'agent-api' }
  const resp = await fetch(`https://api.github.com/repos/${path}/pulls`, { method: 'POST', headers, body: JSON.stringify({ title, body, head, base, maintainer_can_modify: true }) })
  if (resp.status === 201) {
    const p = await resp.json() as { html_url?: string }
    return { ok: true, url: p.html_url, message: `Pull request created: ${p.html_url}` }
  }
  return { ok: false, message: `PR creation failed (${resp.status}): ${await resp.text()}` }
}

async function postResultToChat(result: string, agentId: string, conversationId?: string, alertId?: string, projectRef?: string) {
  if (!SERVICE_ROLE_KEY) return

  if (!alertId && !conversationId) {
    console.warn('[sandbox] postResultToChat: no conversation_id or alert_id — message cannot be stored')
    return
  }

  const messageId = `msg-sandbox-${crypto.randomUUID().replace(/-/g, '')}`
  const payload: Record<string, unknown> = {
    message: { id: messageId, role: 'assistant', parts: [{ type: 'text', text: truncate(result) }], createdAt: new Date().toISOString() },
    agent_id: agentId,
    ...(alertId ? { alert_id: alertId } : {}),
    ...(conversationId ? { conversation_id: conversationId } : {}),
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'X-User-Token': SERVICE_ROLE_KEY,
    'x-internal-append-only': '1',
  }
  const resolvedRef = projectRef ?? PROJECT_REF
  if (resolvedRef) headers['X-Project-Ref'] = resolvedRef

  for (let attempt = 1; attempt <= CHAT_POST_MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(`http://localhost:${PORT}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(CHAT_POST_TIMEOUT_MS),
      })
      if (resp.ok) return
      console.error(`Chat post attempt ${attempt} failed: ${resp.status}`)
    } catch (err) { console.error(`Chat post attempt ${attempt} error:`, err) }
    if (attempt < CHAT_POST_MAX_ATTEMPTS) await sleep(500 * 2 ** (attempt - 1))
  }
}

async function runSandbox(opts: {
  mode: 'readonly' | 'write'
  writeBranch: string
  shouldCreatePr: boolean
  prompt: string
  repoUrl: string
  githubToken: string
  anthropicApiKey: string
  agentId: string
  conversationId?: string
  alertId?: string
  projectRef?: string
}): Promise<void> {
  const { mode, shouldCreatePr, repoUrl, githubToken, anthropicApiKey, agentId, conversationId, alertId, projectRef } = opts
  const writeBranch = opts.mode === 'write' ? opts.writeBranch || createDefaultBranchName() : ''
  let sandbox: any

  try {
    sandbox = await Sandbox.create({
      source: {
        url: repoUrl,
        type: 'git',
        ...(githubToken ? { username: 'x-access-token', password: githubToken } : {}),
      },
      timeout: SANDBOX_TIMEOUT_MS,
    })

    const agentNotes: string[] = []
    const hostGitNotes: string[] = []
    let prUrl = ''

    await runCommand(sandbox, 'git config user.name "Agent Bot" && git config user.email "agent-bot@users.noreply.github.com"')

    if (mode === 'write') {
      await runCommand(sandbox, `git checkout ${shellQuote(writeBranch)} 2>/dev/null || git checkout -b ${shellQuote(writeBranch)}`)
    }

    const { output: headOutput } = await runCommand(sandbox, 'git rev-parse --verify HEAD')
    const initialHead = lastLine(headOutput)

    const cliInstall = await runCommand(sandbox, 'npm install -g @anthropic-ai/claude-code 2>&1 | tail -5')
    if (cliInstall.exitCode !== 0) throw new Error(`Claude CLI install failed: ${cliInstall.output}`)

    if (githubToken) await runCommand(sandbox, `if command -v gh >/dev/null 2>&1; then echo ${shellQuote(githubToken)} | gh auth login --with-token >/dev/null 2>&1 || true; fi`)

    const { output: workdir } = await runCommand(sandbox, 'pwd')

    const summaryBlock = [
      'End your final response with exactly one <summary>...</summary> block containing:',
      '- What was implemented/fixed, files changed, any blockers',
      ...(mode === 'write' ? ['- Commit status, push status, PR URL (if created)'] : ['- Confirmation that no edits/commits were made']),
    ].join('\n')

    const modeInstructions = mode === 'write'
      ? `Write mode: apply changes on branch "${writeBranch}". Commit your changes when complete. The host will push.`
      : 'Readonly mode: do not modify files, create commits, or push.'

    const promptFull = `${opts.prompt}\n\n${modeInstructions}\n\n${summaryBlock}`

    // Write prompt via base64 to avoid shell escaping issues
    const promptB64 = Buffer.from(promptFull).toString('base64')
    await runCommand(sandbox, `printf '%s' ${shellQuote(promptB64)} | base64 -d > /tmp/agent_prompt.txt`)

    // Write a bash runner script so the prompt is read from a file (avoids quoting issues)
    const allowedTools = ['Bash', 'Read', 'Glob', 'Grep', ...(mode === 'write' ? ['Edit'] : [])].join(',')
    const runnerScript = [
      '#!/bin/bash',
      'set -e',
      `cd ${shellQuote(workdir || '/workspace')}`,
      `p=$(< /tmp/agent_prompt.txt)`,
      `exec claude --print "$p" --allowedTools ${shellQuote(allowedTools)} --permission-mode acceptEdits --model claude-haiku-4-5-20251001`,
    ].join('\n')
    const runnerB64 = Buffer.from(runnerScript).toString('base64')
    await runCommand(sandbox, `printf '%s' ${shellQuote(runnerB64)} | base64 -d > /tmp/run_agent.sh && chmod +x /tmp/run_agent.sh`)

    const outputCollector = createOutputCollector()
    let agentSucceeded = false

    for (let attempt = 1; attempt <= 2; attempt++) {
      const writer = new Writable({
        write(chunk: Buffer, _enc: string, cb: () => void) { outputCollector.append(chunk.toString()); cb() },
      })

      const envPrefix = [
        `ANTHROPIC_API_KEY=${shellQuote(anthropicApiKey)}`,
        `RUN_MODE=${mode}`,
        `BRANCH_NAME=${shellQuote(writeBranch)}`,
        'CI=1',
        ...(githubToken ? [`GITHUB_TOKEN=${shellQuote(githubToken)}`] : []),
      ].join(' ')

      const agentRun = await sandbox.runCommand({
        cmd: 'bash',
        args: ['-c', `${envPrefix} /tmp/run_agent.sh`],
        stdout: writer,
      })

      if (agentRun.exitCode === 0) { agentSucceeded = true; break }

      outputCollector.append(`\nExit code: ${agentRun.exitCode}`)
      agentNotes.push(`Agent run failed (attempt ${attempt}): exit code ${agentRun.exitCode}`)
      if (attempt < 2) { await sleep(2000); continue }
    }

    if (mode === 'write') {
      const { output: finalHeadOutput } = await runCommand(sandbox, 'git rev-parse --verify HEAD')
      const finalHead = lastLine(finalHeadOutput)
      if (initialHead && finalHead !== initialHead) {
        const pushResult = await pushBranch(sandbox, writeBranch, githubToken)
        agentNotes.push(pushResult.message); hostGitNotes.push(pushResult.message)

        if (shouldCreatePr && pushResult.ok) {
          const repoInfo = parseGitHubRepo(repoUrl)
          if (repoInfo) {
            const { output: baseOutput } = await runCommand(sandbox, 'git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed "s|refs/remotes/origin/||"')
            const baseBranch = lastLine(baseOutput) || 'main'
            if (baseBranch !== writeBranch) {
              const prTitle = opts.prompt.split(/\r?\n/).map((l) => l.trim()).find(Boolean)
              const prResult = await createPR(
                repoInfo.owner, repoInfo.repo, writeBranch, baseBranch,
                prTitle ? `Code agent: ${prTitle.replace(/\s+/g, ' ').slice(0, 90)}` : `Code agent changes (${writeBranch})`,
                `## Summary\n- Automated changes from code agent.\n- Branch: \`${writeBranch}\`\n\n## Prompt\n\`\`\`\n${truncate(opts.prompt, 2500)}\n\`\`\``,
                githubToken,
              )
              agentNotes.push(prResult.message); hostGitNotes.push(prResult.message)
              if (prResult.url) prUrl = prResult.url
            }
          }
        }
      } else {
        const skip = `No new commits on \`${writeBranch}\`; push skipped.`
        agentNotes.push(skip); hostGitNotes.push(skip)
      }
    }

    const output = outputCollector.getText()
    const summary = extractSummary(output)
    const hostLines = [
      `Execution mode: ${mode}`,
      ...(writeBranch ? [`Branch: ${writeBranch}`] : []),
      ...(prUrl ? [`PR: ${prUrl}`] : []),
      ...hostGitNotes,
    ]
    const resultMessage = summary
      ? `${summary}\n\n${hostLines.join('\n')}`
      : [`Status: ${agentSucceeded ? 'succeeded' : 'failed'}`, ...hostLines, ...agentNotes].join('\n')

    await postResultToChat(resultMessage, agentId, conversationId, alertId, projectRef)
  } catch (err) {
    console.error('Sandbox error:', err)
    await postResultToChat(`**Sandbox Error**\n\n${err instanceof Error ? err.message : String(err)}`, agentId, conversationId, alertId, projectRef)
  } finally {
    if (sandbox) { try { await sandbox.stop() } catch { /* ignore */ } }
  }
}

export const sandboxTools = {
  'deploy-code-agent': tool({
    description:
      'Deploy a Claude code agent in a Vercel Sandbox to review a codebase, debug issues, or implement changes. ' +
      'The sandbox already has repository context — do not ask the user for repo URLs or code files. ' +
      'Use mode="readonly" for review/debug; mode="write" when code changes are expected. ' +
      'Set createPr=true in write mode to open a GitHub PR after push. ' +
      'If you have created an alert as part of this task and want the sandbox results recorded against that alert ' +
      'instead of the current conversation, pass the alert UUID as alert_id. ' +
      'When alert_id is provided the result is posted to the alert thread only, not the conversation. ' +
      'This is a high-cost action — only call it when explicitly requested.',
    inputSchema: z.object({
      mode: z.enum(['readonly', 'write']).default('readonly').describe('Execution mode.'),
      branch: z.string().optional().describe('Target branch for write mode. Auto-generated if omitted.'),
      createPr: z.boolean().default(false).describe('Open a GitHub PR after pushing commits (write mode only).'),
      agent_id: z
        .string()
        .uuid()
        .optional()
        .describe('Optional agent UUID override. Normally omitted and resolved from the current chat context.'),
      alert_id: z
        .string()
        .uuid()
        .optional()
        .describe(
          'UUID of an alert to post results to. When provided, the sandbox result is recorded against this alert ' +
          'instead of the current conversation. Use this when you have created an alert as part of the current task.'
        ),
      prompt: z.string().describe('Detailed instructions for the code agent.'),
    }),
    execute: async ({ mode, branch, createPr, agent_id, alert_id, prompt }) => {
      const ctx = getToolContext()

      const anthropicApiKey = process.env.SANDBOX_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
      const repoUrl = process.env.GITHUB_REPO_URL
      const resolvedAgentId = agent_id?.trim() || ctx.agentId
      const resolvedAlertId = alert_id?.trim() || ctx.alertId

      if (!anthropicApiKey) return { success: false, error: 'ANTHROPIC_API_KEY is not configured' }
      if (!repoUrl) return { success: false, error: 'GITHUB_REPO_URL is not configured' }
      if (!resolvedAgentId) {
        return {
          success: false,
          error:
            'Cannot deploy code agent without an agent_id. Ensure the current agent context is set, or pass agent_id explicitly.',
        }
      }

      const writeBranch = mode === 'write' ? (branch?.trim() || createDefaultBranchName()) : ''

      // When an alert_id is explicitly supplied the result belongs to the alert thread only.
      // Omit conversationId so the post is not duplicated into the conversation.
      const conversationId = resolvedAlertId ? undefined : ctx.conversationId

      void runSandbox({
        mode,
        writeBranch,
        shouldCreatePr: mode === 'write' && createPr,
        prompt,
        repoUrl,
        githubToken: process.env.GITHUB_TOKEN || '',
        anthropicApiKey,
        agentId: resolvedAgentId,
        conversationId,
        alertId: resolvedAlertId,
        projectRef: ctx.projectRef ?? undefined,
      })

      return {
        success: true,
        message: 'Code agent deployed and running in the background. Results will appear in this conversation when complete.',
        mode,
        ...(writeBranch ? { branch: writeBranch } : {}),
      }
    },
  }),
}
