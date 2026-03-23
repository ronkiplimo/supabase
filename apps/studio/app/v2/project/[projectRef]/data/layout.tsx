import { StudioDataWorkspace } from '@/components/v2/data/StudioDataWorkspace'

export default function DataLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { projectRef: string }
}) {
  return <StudioDataWorkspace projectRef={params.projectRef}>{children}</StudioDataWorkspace>
}

