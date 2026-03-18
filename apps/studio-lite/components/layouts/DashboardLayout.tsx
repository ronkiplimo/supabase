'use client'

import { SidebarProvider } from 'ui'

import { AppSidebar, LayoutHeader } from '@/components/navigation'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex flex-col h-screen w-screen">
        <LayoutHeader />
        <div className="flex flex-1 overflow-y-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
