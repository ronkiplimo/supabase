import { StateBadge } from 'ui-patterns/StateBadge'

export default function StateBadgeDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <StateBadge state="success" />
      <StateBadge state="failure" />
      <StateBadge state="pending" />
      <StateBadge state="skipped" />
      <StateBadge state="enabled" />
      <StateBadge state="disabled" />
      <StateBadge state="unknown" />
      <StateBadge state="pending">Retrying</StateBadge>
    </div>
  )
}
