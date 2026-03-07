'use client'

import { AlertCircle, Send, Eye, X } from 'lucide-react'
import type { ErrorNotification } from '@/hooks/useErrorNotifications'

interface ErrorNotificationCardProps {
  error: ErrorNotification
  onDismiss: () => void
  onSendToFix: (message: string) => void
  onViewDetails: () => void
}

export function ErrorNotificationCard({
  error,
  onDismiss,
  onSendToFix,
  onViewDetails,
}: ErrorNotificationCardProps) {
  return (
    <div className="mx-2 mb-2 bg-destructive/5 border border-destructive/20 rounded-lg p-3 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-destructive">Error Found</div>
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words font-mono">
            {error.message.substring(0, 200)}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onSendToFix(error.message)}
              className="inline-flex items-center gap-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-3"
            >
              <Send className="h-3 w-3" />
              Send to Fix
            </button>
            <button
              onClick={onViewDetails}
              className="inline-flex items-center gap-1 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-3"
            >
              <Eye className="h-3 w-3" />
              Details
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-sm opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
