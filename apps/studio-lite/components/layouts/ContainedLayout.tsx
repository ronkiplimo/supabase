'use client'

export function ContainedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[80rem] mx-auto py-16">{children}</div>
    </div>
  )
}
