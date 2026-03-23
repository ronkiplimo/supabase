import dynamic from 'next/dynamic'

// Client-only: HomeView pulls in reactflow via InstanceConfiguration; Turbopack must not
// resolve it on the server graph for this App Router entry.
const HomeView = dynamic(
  () => import('@/components/v2/HomeView').then((mod) => mod.HomeView),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] w-full items-center justify-center p-8 text-sm text-foreground-lighter">
        Loading project…
      </div>
    ),
  }
)

export default function V2ProjectPage() {
  return <HomeView />
}
