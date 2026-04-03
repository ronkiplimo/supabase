import pgMeta, { getEntityDefinitionsSql } from '@supabase/pg-meta'
import { generateText, ModelMessage, stepCountIs, tool } from 'ai'
import { IS_PLATFORM } from 'common'
import { source } from 'common-tags'
import { executeSql } from 'data/sql/execute-sql-query'
import { AiOptInLevel } from 'hooks/misc/useOrgOptedIntoAi'
import { getModel } from 'lib/ai/model'
import { DEFAULT_COMPLETION_MODEL } from 'lib/ai/model.utils'
import { getOrgAIDetails } from 'lib/ai/org-ai-details'
import {
  COMPLETION_PROMPT,
  EDGE_FUNCTION_PROMPT,
  PG_BEST_PRACTICES,
  SECURITY_PROMPT,
} from 'lib/ai/prompts'
import apiWrapper from 'lib/api/apiWrapper'
import { executeQuery } from 'lib/api/self-hosted/query'
import { NextApiRequest, NextApiResponse } from 'next'
import z from 'zod'

export const maxDuration = 60

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    const { completionMetadata, projectRef, connectionString, orgSlug, language } = req.body
    const { textBeforeCursor, textAfterCursor, prompt, selection } = completionMetadata

    if (!projectRef) {
      return res.status(400).json({ error: 'Missing project_ref in request body' })
    }

    const authorization = req.headers.authorization

    let aiOptInLevel: AiOptInLevel = IS_PLATFORM ? 'disabled' : 'schema'

    if (IS_PLATFORM && orgSlug && authorization && projectRef) {
      const { aiOptInLevel: orgAIOptInLevel } = await getOrgAIDetails({
        orgSlug,
        authorization,
        projectRef,
      })
      aiOptInLevel = orgAIOptInLevel
    }

    const {
      modelParams,
      error: modelError,
      promptProviderOptions,
    } = await getModel({
      provider: 'openai',
      modelEntry: DEFAULT_COMPLETION_MODEL,
    })

    if (modelError) {
      return res.status(500).json({ error: modelError.message })
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(authorization && { Authorization: authorization }),
    }

    const includeSchema = aiOptInLevel !== 'disabled'

    const pgMetaSchemasList = pgMeta.schemas.list()
    type Schemas = z.infer<(typeof pgMetaSchemasList)['zod']>

    type EntityDefinitionRow = { data: { definitions: Array<{ id: number; sql: string }> } }

    const [{ result: schemas }, { result: publicDefs }] = await (includeSchema
      ? Promise.all([
          executeSql<Schemas>(
            { projectRef, connectionString, sql: pgMetaSchemasList.sql },
            undefined,
            headers,
            IS_PLATFORM ? undefined : executeQuery
          ),
          executeSql<EntityDefinitionRow[]>(
            {
              projectRef,
              connectionString,
              sql: getEntityDefinitionsSql({ schemas: ['public'] }),
            },
            undefined,
            headers,
            IS_PLATFORM ? undefined : executeQuery
          ),
        ])
      : Promise.resolve([{ result: [] as Schemas }, { result: [] as EntityDefinitionRow[] }]))

    const publicSchemaDDL = publicDefs?.[0]?.data?.definitions?.map((d) => d.sql).join('\n\n')

    const otherSchemaNames = schemas
      ?.map((s) => s.name)
      .filter((name) => name !== 'public')
      .join(', ')

    // Important: do not use dynamic content in the system prompt or Bedrock will not cache it
    const system = source`
      ${COMPLETION_PROMPT}
      ${language === 'sql' ? PG_BEST_PRACTICES : EDGE_FUNCTION_PROMPT}
      ${SECURITY_PROMPT}
    `

    // Note: these must be of type `CoreMessage` to prevent AI SDK from stripping `providerOptions`
    // https://github.com/vercel/ai/blob/81ef2511311e8af34d75e37fc8204a82e775e8c3/packages/ai/core/prompt/standardize-prompt.ts#L83-L88
    const coreMessages: ModelMessage[] = [
      {
        role: 'system',
        content: system,
        ...(promptProviderOptions && { providerOptions: promptProviderOptions }),
      },
      {
        role: 'user',
        content: source`
          You are helping me edit some code.
          Here is the context:
          ${textBeforeCursor}<selection>${selection}</selection>${textAfterCursor}

          ${publicSchemaDDL ? `Public schema:\n${publicSchemaDDL}` : ''}
          ${otherSchemaNames ? `Other available schemas (use getSchemaDefinitions to look them up): ${otherSchemaNames}` : ''}

          Instructions:
          1. Only modify the selected text based on this prompt: ${prompt}
          2. Your response should be ONLY the modified selection text, nothing else. Remove selected text if needed.
          3. Do not wrap in code blocks or markdown
          4. You can respond with one word or multiple words
          5. Ensure the modified text flows naturally within the current line
          6. Avoid duplicating code when considering the full statement
          7. If there is no surrounding context (before or after), make sure your response is a complete valid SQL statement that can be run and resolves the prompt.

          Modify the selected text now:
        `,
      },
    ]

    const { text } = await generateText({
      ...modelParams,
      stopWhen: stepCountIs(5),
      messages: coreMessages,
      tools: includeSchema
        ? {
            getSchemaDefinitions: tool({
              description: 'Get table and column definitions for one or more schemas',
              inputSchema: z.object({
                schemas: z
                  .array(z.string())
                  .describe('The schema names to get the definitions for'),
              }),
              execute: async ({ schemas: schemaNames }) => {
                const { result } = await executeSql(
                  {
                    projectRef,
                    connectionString,
                    sql: getEntityDefinitionsSql({ schemas: schemaNames }),
                  },
                  undefined,
                  headers,
                  IS_PLATFORM ? undefined : executeQuery
                )
                return result
              },
            }),
          }
        : undefined,
    })

    return res.status(200).json(text)
  } catch (error) {
    console.error('Completion error:', error)
    return res.status(500).json({ error: 'Failed to generate completion' })
  }
}

const wrapper = (req: NextApiRequest, res: NextApiResponse) =>
  apiWrapper(req, res, handler, { withAuth: true })

export default wrapper
