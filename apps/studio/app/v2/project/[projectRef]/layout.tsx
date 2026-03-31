import { ProjectShell } from './ProjectShell'
import { V2AuthGuard } from './V2AuthGuard'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <V2AuthGuard>
      <ProjectShell>{children}</ProjectShell>
    </V2AuthGuard>
  )
}
