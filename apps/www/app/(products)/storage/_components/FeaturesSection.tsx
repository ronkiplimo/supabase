'use client'

import { useState } from 'react'
import { cn } from 'ui'

const FEATURES = [
  {
    title: 'Interoperable',
    description:
      'Integrates with the rest of Supabase — Auth and Postgres work together seamlessly.',
    visual: InteroperableSkeleton,
  },
  {
    title: 'Lightning fast',
    description:
      'Thin API server layer that leverages Postgres permissions and delivers content via global CDN.',
    visual: CDNSkeleton,
  },
  {
    title: 'Multiple bucket types',
    description:
      'Files, Analytics, or Vector buckets — choose the right storage model for your application.',
    visual: BucketsSkeleton,
  },
]

function InteroperableSkeleton() {
  const [hovered, setHovered] = useState(false)

  const products = [
    { name: 'Storage', color: '#3ECF8E' },
    { name: 'Auth', color: '#6c63ff' },
    { name: 'Database', color: '#3ECF8E' },
  ]

  return (
    <div
      className="flex items-center justify-center w-full h-full relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 75%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 75%)',
      }}
    >
      <div className="flex items-center gap-4">
        {products.map((product, i) => (
          <div key={product.name} className="flex items-center gap-4">
            <div
              className={cn(
                'w-16 h-16 rounded-lg border flex items-center justify-center transition-all duration-500',
                hovered ? 'bg-surface-200 border-brand/30' : 'bg-surface-75 border-border'
              )}
            >
              <span
                className="text-xs font-medium transition-colors duration-500"
                style={{ color: hovered ? product.color : 'hsl(var(--foreground-muted))' }}
              >
                {product.name}
              </span>
            </div>
            {i < products.length - 1 && (
              <div
                className={cn(
                  'w-8 h-px transition-colors duration-500',
                  hovered ? 'bg-brand/40' : 'bg-foreground-muted/20'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CDNSkeleton() {
  return (
    <div
      className="flex items-center justify-center w-full h-full relative"
      style={{
        maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 75%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 75%)',
      }}
    >
      <svg viewBox="0 0 320 320" className="w-64 h-64" fill="none">
        {/* Globe outline */}
        <circle
          cx="160"
          cy="160"
          r="120"
          stroke="hsl(var(--foreground-muted))"
          strokeWidth="0.5"
          opacity="0.3"
        />
        <ellipse
          cx="160"
          cy="160"
          rx="60"
          ry="120"
          stroke="hsl(var(--foreground-muted))"
          strokeWidth="0.5"
          opacity="0.3"
        />
        <line
          x1="40"
          y1="160"
          x2="280"
          y2="160"
          stroke="hsl(var(--foreground-muted))"
          strokeWidth="0.5"
          opacity="0.3"
        />
        <line
          x1="160"
          y1="40"
          x2="160"
          y2="280"
          stroke="hsl(var(--foreground-muted))"
          strokeWidth="0.5"
          opacity="0.3"
        />
        {/* CDN nodes */}
        {[
          { cx: 160, cy: 60 },
          { cx: 260, cy: 130 },
          { cx: 240, cy: 230 },
          { cx: 80, cy: 230 },
          { cx: 60, cy: 130 },
        ].map((pos, i) => (
          <g key={i}>
            <line
              x1="160"
              y1="160"
              x2={pos.cx}
              y2={pos.cy}
              stroke="#3ECF8E"
              strokeWidth="0.5"
              opacity="0.2"
              strokeDasharray="4 4"
            />
            <circle cx={pos.cx} cy={pos.cy} r="6" fill="#3ECF8E" opacity="0.3" />
            <circle cx={pos.cx} cy={pos.cy} r="3" fill="#3ECF8E" opacity="0.6" />
          </g>
        ))}
        {/* Center node */}
        <circle cx="160" cy="160" r="8" fill="#3ECF8E" opacity="0.4" />
        <circle cx="160" cy="160" r="4" fill="#3ECF8E" />
      </svg>
    </div>
  )
}

function BucketsSkeleton() {
  const buckets = [
    { name: 'Files', label: 'images, videos, docs' },
    { name: 'Analytics', label: 'Iceberg, time-series' },
    { name: 'Vectors', label: 'embeddings, RAG' },
  ]

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="flex flex-col gap-2 w-52">
        {buckets.map((bucket) => (
          <div
            key={bucket.name}
            className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-surface-75"
          >
            <span className="text-foreground text-xs font-medium">{bucket.name}</span>
            <span className="text-foreground-muted text-[11px]">{bucket.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FeaturesSection() {
  return (
    <div className="py-24 flex flex-col gap-16">
      {/* Header */}
      <div className="mx-auto max-w-[var(--container-max-w,75rem)] px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-end">
          <h3 className="text-2xl md:text-4xl text-foreground-lighter max-w-xl">
            Everything you need
            <br />
            <span className="text-foreground">for object storage</span>
          </h3>
          <p className="text-foreground-lighter text-sm lg:text-base">
            S3 compatible object storage with global CDN, image transformations, and fine-grained
            access controls powered by Postgres RLS.
          </p>
        </div>
      </div>

      {/* 3-col grid */}
      <div className="mx-auto max-w-[var(--container-max-w,75rem)] px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FEATURES.map((feature) => {
            const Visual = feature.visual
            return (
              <div
                key={feature.title}
                className="flex flex-col bg-surface-75 border border-border rounded-lg overflow-hidden"
              >
                <div className="relative flex items-center justify-center h-[320px]">
                  <Visual />
                </div>
                <div className="px-6 py-5 flex flex-col gap-1">
                  <h4 className="text-foreground text-sm font-medium">{feature.title}</h4>
                  <p className="text-foreground-lighter text-sm">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
