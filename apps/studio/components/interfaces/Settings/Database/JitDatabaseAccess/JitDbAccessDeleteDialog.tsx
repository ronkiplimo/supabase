import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from 'ui'

import { JIT_DB_ACCESS_PRODUCT_NAME_LOWER } from './JitDbAccess.constants'
import type { JitUserRule } from './JitDbAccess.types'

interface JitDbAccessDeleteDialogProps {
  user: JitUserRule | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function JitDbAccessDeleteDialog({
  user,
  isDeleting = false,
  onClose,
  onConfirm,
}: JitDbAccessDeleteDialogProps) {
  const userDisplayName = user?.name?.trim() || user?.email || 'this user'

  return (
    <AlertDialog open={!!user} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <AlertDialogContent size="medium">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete ephemeral access rule</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Remove the {JIT_DB_ACCESS_PRODUCT_NAME_LOWER} rule for{' '}
                <strong className="text-foreground">{userDisplayName}</strong>?
              </p>
              <p>
                This revokes any assigned database roles for this member and removes their{' '}
                {JIT_DB_ACCESS_PRODUCT_NAME_LOWER} configuration.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="danger" asChild>
            <Button
              loading={isDeleting}
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault()
                onConfirm()
              }}
            >
              Delete rule
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
