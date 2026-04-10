'use client'

import { EyeOff } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import { Button, cn, Popover_Shadcn_, PopoverContent_Shadcn_, PopoverTrigger_Shadcn_ } from 'ui'

import { useDevToolbar } from './DevToolbarContext'

const IS_LOCAL_DEV = process.env.NODE_ENV === 'development'
const POSITION_STORAGE_KEY = 'dev-telemetry-toolbar-position'
const DRAG_THRESHOLD = 4
const MARGIN = 24
const BUTTON_SIZE = 40 // h-10 w-10

// Spring easing: slight overshoot then settle
const SNAP_TRANSITION =
  'top 380ms cubic-bezier(0.34, 1.56, 0.64, 1), left 380ms cubic-bezier(0.34, 1.56, 0.64, 1)'

type SnapPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

// All positions expressed as pixel top+left so transitions interpolate cleanly
function getSnapCoords(
  position: SnapPosition,
  vw: number,
  vh: number
): { top: number; left: number } {
  const [row, col] = position.split('-')
  const top =
    row === 'top'
      ? MARGIN
      : row === 'bottom'
        ? vh - MARGIN - BUTTON_SIZE
        : Math.round(vh / 2 - BUTTON_SIZE / 2)
  const left =
    col === 'left'
      ? MARGIN
      : col === 'right'
        ? vw - MARGIN - BUTTON_SIZE
        : Math.round(vw / 2 - BUTTON_SIZE / 2)
  return { top, left }
}

function getPopoverSide(position: SnapPosition): 'top' | 'bottom' | 'left' | 'right' {
  const [row, col] = position.split('-')
  if (row === 'middle') return col === 'right' ? 'left' : 'right'
  return row === 'top' ? 'bottom' : 'top'
}

function getPopoverAlign(position: SnapPosition): 'start' | 'center' | 'end' {
  const [row, col] = position.split('-')
  if (row === 'middle') return 'center'
  return col === 'left' ? 'start' : col === 'right' ? 'end' : 'center'
}

function getNearestSnapPosition(cx: number, cy: number): SnapPosition {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const row = cy < vh / 3 ? 'top' : cy > (2 * vh) / 3 ? 'bottom' : 'middle'
  const col = cx < vw / 3 ? 'left' : cx > (2 * vw) / 3 ? 'right' : 'center'
  return `${row}-${col}` as SnapPosition
}

function readStoredPosition(): SnapPosition {
  if (typeof window === 'undefined') return 'bottom-right'
  return (localStorage.getItem(POSITION_STORAGE_KEY) as SnapPosition) ?? 'bottom-right'
}

export function DevToolbarTrigger() {
  const { isEnabled, isOpen, setIsOpen, events, dismissToolbar } = useDevToolbar()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [snapPosition, setSnapPosition] = useState<SnapPosition>('bottom-right')
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  // Holds the last drag pixel position for one RAF to prime the CSS transition
  const [releasedAt, setReleasedAt] = useState<{ x: number; y: number } | null>(null)
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }))

  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dragRef = useRef<{
    startPointerX: number
    startPointerY: number
    startButtonX: number
    startButtonY: number
    hasDragged: boolean
  } | null>(null)
  const wasDraggingRef = useRef(false)

  // Restore persisted position after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const stored = readStoredPosition()
    if (stored !== 'bottom-right') setSnapPosition(stored)
  }, [])

  // Keep snap coords accurate on resize
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  // Two-phase snap: hold last drag position for one frame (primes the transition),
  // then clear it so the spring fires from that position to the snap target
  useEffect(() => {
    if (releasedAt === null) return
    const id = requestAnimationFrame(() => setReleasedAt(null))
    return () => cancelAnimationFrame(id)
  }, [releasedAt])

  const handlePointerDown = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startButtonX: rect.left,
      startButtonY: rect.top,
      hasDragged: false,
    }
    wasDraggingRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startPointerX
    const dy = e.clientY - dragRef.current.startPointerY
    if (!dragRef.current.hasDragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    dragRef.current.hasDragged = true
    setDragPos({
      x: dragRef.current.startButtonX + dx,
      y: dragRef.current.startButtonY + dy,
    })
  }, [])

  const handlePointerUp = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    const { hasDragged } = dragRef.current
    dragRef.current = null
    wasDraggingRef.current = hasDragged
    if (!hasDragged) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const newPosition = getNearestSnapPosition(cx, cy)
    setSnapPosition(newPosition)
    localStorage.setItem(POSITION_STORAGE_KEY, newPosition)
    // Phase 1: park at last drag position with transition primed
    setReleasedAt({ x: rect.left, y: rect.top })
    setDragPos(null)
  }, [])

  const handlePointerCancel = useCallback(() => {
    dragRef.current = null
    wasDraggingRef.current = false
    setDragPos(null)
    setReleasedAt(null)
  }, [])

  if (!IS_LOCAL_DEV || !isEnabled) return null

  const eventCount = events.length
  const isDragging = dragPos !== null
  const snapCoords = getSnapCoords(snapPosition, viewport.w, viewport.h)

  const containerStyle: CSSProperties =
    dragPos !== null
      ? { position: 'fixed', zIndex: 50, left: dragPos.x, top: dragPos.y, transition: 'none' }
      : releasedAt !== null
        ? // Phase 1: same pixel position as drag end, transition now defined
          {
            position: 'fixed',
            zIndex: 50,
            left: releasedAt.x,
            top: releasedAt.y,
            transition: SNAP_TRANSITION,
          }
        : // Phase 2: spring fires from releasedAt → snapCoords
          { position: 'fixed', zIndex: 50, ...snapCoords, transition: SNAP_TRANSITION }

  const handleClick = () => {
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false
      return
    }
    setPopoverOpen(false)
    setIsOpen(true)
  }

  const handleDismiss = () => {
    setPopoverOpen(false)
    dismissToolbar()
  }

  const handleMouseEnter = () => {
    if (isDragging) return
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setPopoverOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => setPopoverOpen(false), 100)
  }

  const handleTriggerMouseLeave = (event: MouseEvent<HTMLButtonElement>) => {
    handleMouseLeave()
    event.currentTarget.blur()
  }

  return (
    <div style={containerStyle}>
      <Popover_Shadcn_ open={popoverOpen && !isDragging} onOpenChange={setPopoverOpen}>
        <PopoverTrigger_Shadcn_ asChild>
          <Button
            type="text"
            className={cn(
              'relative rounded-full h-10 w-10 p-0',
              'bg-surface-100 border border-overlay shadow-md',
              'text-foreground-light hover:text-foreground hover:bg-surface-200',
              'focus-visible:outline-0 focus-visible:outline-transparent focus-visible:outline-offset-0',
              'select-none touch-none',
              isDragging ? 'cursor-grabbing' : 'cursor-pointer',
              isOpen && !isDragging && 'text-foreground bg-surface-300'
            )}
            aria-label="Open dev toolbar"
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleTriggerMouseLeave}
          >
            <Image
              src="/img/logo-pixel-small-light.png"
              alt="Dev Toolbar"
              width={16}
              height={16}
              style={{
                filter:
                  'brightness(0) saturate(100%) invert(72%) sepia(57%) saturate(431%) hue-rotate(108deg) brightness(95%) contrast(91%)',
              }}
              aria-hidden="true"
              className="pointer-events-none"
            />
            {eventCount > 0 && (
              <span
                className={cn(
                  'absolute -top-1 -right-1',
                  'h-4 min-w-4 px-0.5',
                  'inline-flex items-center justify-center',
                  'rounded-full bg-destructive text-foreground',
                  'text-[10px] font-medium leading-none'
                )}
              >
                {eventCount > 99 ? '99+' : eventCount}
              </span>
            )}
          </Button>
        </PopoverTrigger_Shadcn_>
        <PopoverContent_Shadcn_
          side={getPopoverSide(snapPosition)}
          align={getPopoverAlign(snapPosition)}
          sideOffset={8}
          className="w-auto p-1"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-200 text-foreground-light hover:text-foreground whitespace-nowrap"
            onClick={handleDismiss}
          >
            <EyeOff className="w-4 h-4 shrink-0" />
            <span>Hide</span>
          </button>
        </PopoverContent_Shadcn_>
      </Popover_Shadcn_>
    </div>
  )
}
