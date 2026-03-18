'use client'

import { Check, Monitor, Moon, Settings, Sun, User } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'ui'

const THEMES = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
] as const

export function UserMenu() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="text"
          className="rounded-full h-8 w-8 p-0"
          icon={<User size={16} strokeWidth={1.5} />}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <Settings size={14} strokeWidth={1.5} />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {THEMES.map((t) => {
          const Icon = t.icon
          return (
            <DropdownMenuItem
              key={t.key}
              onClick={() => setTheme(t.key)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Icon size={14} strokeWidth={1.5} />
                {t.label}
              </span>
              {theme === t.key && <Check size={14} strokeWidth={1.5} />}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-foreground-light">Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
