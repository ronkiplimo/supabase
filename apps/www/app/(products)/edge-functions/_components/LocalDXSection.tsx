'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { cn } from 'ui'

const LocalDXImage = dynamic(() => import('~/components/Products/Functions/LocalDXImage'))
const ParityImage = dynamic(() => import('~/components/Products/Functions/ParityImage'))
const NpmEcosystem = dynamic(() => import('~/components/Products/Functions/NpmEcosystem'))
const CI = dynamic(() => import('~/components/Products/Functions/CI'))

const cards = [
  {
    id: 'localDX',
    label: 'First-class local dev experience',
    paragraph:
      'Write code with hot code reloading, a fast Language server for autocompletion, type checking and linting',
    image: <LocalDXImage />,
    imageClassname: 'pb-8 md:pb-12',
  },
  {
    id: 'parity',
    label: 'Dev and Prod parity',
    paragraph: (
      <>
        The open source{' '}
        <Link
          href="https://github.com/supabase/edge-runtime/"
          className="underline hover:text-foreground-light transition-colors"
          target="_blank"
        >
          Edge runtime
        </Link>{' '}
        runs locally in dev and powers functions in production
      </>
    ),
    image: <ParityImage />,
    imageClassname: 'pb-8 md:pb-12 pt-7',
  },
  {
    id: 'ecosystem',
    label: 'Use any NPM module',
    paragraph: 'Tap into the 2+ million modules in the Deno and NPM ecosystem',
    image: <NpmEcosystem />,
  },
  {
    id: 'ci',
    label: 'Continuous Integration',
    paragraph: (
      <>
        Use the{' '}
        <Link
          href="https://supabase.com/docs/guides/functions/cicd-workflow"
          className="underline hover:text-foreground-light transition-colors"
          target="_blank"
        >
          Supabase CLI with GitHub actions
        </Link>{' '}
        to preview and deploy your functions along with the rest of your application
      </>
    ),
    image: <CI />,
    imageClassname: 'pl-2 pt-8 md:pt-12',
  },
]

const GRID_CLASS: Record<string, string> = {
  localDX: 'col-span-1 md:border-r',
  parity: 'col-span-1 xl:border-r',
  ecosystem: 'col-span-1 md:row-span-2 !border-b-0',
  ci: 'col-span-1 md:col-span-2 xl:border-r !border-b-0',
}

export function LocalDXSection() {
  return (
    <div>
      {/* Header row */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-[var(--container-max-w,75rem)] px-6 border-x border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-end pt-32 pb-8">
            <h3 className="text-2xl md:text-4xl text-foreground-lighter max-w-xl">
              Delightful DX from <br />
              <span className="text-foreground">local to production</span>
            </h3>
            <p className="text-foreground-lighter text-sm lg:text-base">
              Edge Functions are developed using{' '}
              <Link
                href="https://deno.com/"
                className="underline hover:text-foreground-light transition-colors"
                target="_blank"
              >
                Deno
              </Link>
              , an open source JavaScript runtime that ensures maximum power and flexibility.
              Migrate in and out at any time with no vendor lock-in.
            </p>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className="mx-auto max-w-[var(--container-max-w,75rem)] border-x border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className={cn('flex flex-col border-b border-border', GRID_CLASS[card.id])}
            >
              <div
                className={cn(
                  'flex-1 flex items-center justify-center overflow-hidden',
                  card.imageClassname
                )}
              >
                {card.image}
              </div>
              <div className="flex flex-col gap-1 px-6 py-5 border-t border-border bg-surface-200">
                <h4 className="text-foreground text-sm font-medium">{card.label}</h4>
                <p className="text-foreground-lighter text-sm">{card.paragraph}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
