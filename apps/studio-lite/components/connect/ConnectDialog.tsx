'use client'

import { Check, Copy, Database, FileCode, Globe, Terminal } from 'lucide-react'
import { useCallback, useState } from 'react'
import {
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogSectionSeparator,
  DialogTitle,
  Tabs_Shadcn_,
  TabsContent_Shadcn_,
  TabsList_Shadcn_,
  TabsTrigger_Shadcn_,
} from 'ui'

type ConnectMode = 'direct' | 'sdk' | 'orm'

const MODES: { key: ConnectMode; icon: typeof Database; title: string; description: string }[] = [
  {
    key: 'direct',
    icon: Terminal,
    title: 'Direct connection',
    description: 'Connect directly to SQLite',
  },
  {
    key: 'sdk',
    icon: Globe,
    title: 'SDK',
    description: 'Connect via the JS/TS SDK',
  },
  {
    key: 'orm',
    icon: FileCode,
    title: 'ORMs',
    description: 'Connect via Drizzle, Prisma, etc.',
  },
]

export interface ConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectDialog({ open, onOpenChange }: ConnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl p-0 rounded-lg" centered={false}>
        <DialogHeader className="text-left px-6 pt-6 pb-4">
          <DialogTitle>Connect to your project</DialogTitle>
          <DialogDescription>
            Get the connection strings and environment variables for your app.
          </DialogDescription>
        </DialogHeader>

        <Tabs_Shadcn_ defaultValue="direct">
          <TabsList_Shadcn_ className="px-6 gap-4 border-b rounded-none bg-transparent h-auto pb-0">
            {MODES.map((m) => (
              <TabsTrigger_Shadcn_
                key={m.key}
                value={m.key}
                className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:shadow-none bg-transparent text-foreground-light data-[state=active]:text-foreground"
              >
                {m.title}
              </TabsTrigger_Shadcn_>
            ))}
          </TabsList_Shadcn_>

          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            <TabsContent_Shadcn_ value="direct" className="mt-0 flex flex-col gap-6">
              <DirectConnectionContent />
            </TabsContent_Shadcn_>
            <TabsContent_Shadcn_ value="sdk" className="mt-0 flex flex-col gap-6">
              <SdkContent />
            </TabsContent_Shadcn_>
            <TabsContent_Shadcn_ value="orm" className="mt-0 flex flex-col gap-6">
              <OrmContent />
            </TabsContent_Shadcn_>
          </div>
        </Tabs_Shadcn_>
      </DialogContent>
    </Dialog>
  )
}

function DirectConnectionContent() {
  return (
    <>
      <ConnectStep number={1} title="Connection parameters">
        <ConnectionParams
          params={[
            { label: 'Database', value: './supalite.db' },
            { label: 'Driver', value: 'better-sqlite3' },
            { label: 'Mode', value: 'WAL' },
          ]}
        />
      </ConnectStep>
      <ConnectStep number={2} title="Connect via CLI">
        <CodeBlock title="Terminal" code="sqlite3 ./supalite.db" />
      </ConnectStep>
      <ConnectStep number={3} title="Connect via Node.js">
        <CodeBlock
          title="index.ts"
          code={`import Database from 'better-sqlite3'

const db = new Database('./supalite.db')

const rows = db.prepare('SELECT * FROM todos').all()
console.log(rows)`}
        />
      </ConnectStep>
    </>
  )
}

function SdkContent() {
  return (
    <>
      <ConnectStep number={1} title="Install the SDK">
        <CodeBlock title="Terminal" code="npm install @supabase/supalite" />
      </ConnectStep>
      <ConnectStep number={2} title="Initialize the client">
        <CodeBlock
          title="supalite.ts"
          code={`import { createClient } from '@supabase/supalite'

const supalite = createClient('./supalite.db')

// Query data
const { data, error } = await supalite
  .from('todos')
  .select('*')
  .eq('completed', 0)`}
        />
      </ConnectStep>
      <ConnectStep number={3} title="Environment variables">
        <CodeBlock title=".env" code={`SUPALITE_DB_PATH=./supalite.db`} />
      </ConnectStep>
    </>
  )
}

function OrmContent() {
  return (
    <>
      <ConnectStep number={1} title="Drizzle ORM">
        <CodeBlock
          title="drizzle.config.ts"
          code={`import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  dbCredentials: {
    url: './supalite.db',
  },
})`}
        />
      </ConnectStep>
      <ConnectStep number={2} title="Prisma">
        <CodeBlock
          title="schema.prisma"
          code={`datasource db {
  provider = "sqlite"
  url      = "file:./supalite.db"
}

generator client {
  provider = "prisma-client-js"
}`}
        />
      </ConnectStep>
    </>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConnectStep({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex items-center justify-center w-6 h-6 rounded bg-surface-300 text-xs font-mono text-foreground-light flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex-1 flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {children}
      </div>
    </div>
  )
}

function ConnectionParams({ params }: { params: { label: string; value: string }[] }) {
  return (
    <div className="rounded-md border bg-surface-100 font-mono text-sm divide-y">
      {params.map((p) => (
        <div key={p.label} className="flex items-center justify-between px-3 py-2">
          <span className="text-foreground-light">{p.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-foreground">{p.value}</span>
            <CopyButton value={p.value} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-surface-200">
        <span className="text-xs text-foreground-light">{title}</span>
        <CopyButton value={code} />
      </div>
      <pre className="p-3 text-xs font-mono text-foreground bg-surface-100 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])

  return (
    <button
      onClick={handleCopy}
      className="text-foreground-lighter hover:text-foreground transition-colors p-0.5"
    >
      {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
    </button>
  )
}
