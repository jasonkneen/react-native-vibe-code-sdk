'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface EditableProjectTitleProps {
  projectTitle?: string
  projectId?: string
  userId?: string
  onTitleUpdate?: (newTitle: string) => void
}

export function EditableProjectTitle({
  projectTitle,
  projectId,
  userId,
  onTitleUpdate,
}: EditableProjectTitleProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(projectTitle || '')
  const [isSavingTitle, setIsSavingTitle] = useState(false)

  // Update edited title when projectTitle changes
  useEffect(() => {
    setEditedTitle(projectTitle || '')
  }, [projectTitle])

  const handleSaveTitle = async () => {
    if (!projectId || !userId) return

    const trimmedTitle = editedTitle.trim()
    if (!trimmedTitle || trimmedTitle === projectTitle) {
      setIsEditingTitle(false)
      setEditedTitle(projectTitle || '')
      return
    }

    setIsSavingTitle(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: trimmedTitle,
          userID: userId,
        }),
      })

      if (response.ok) {
        toast.success('Project title updated successfully')
        setIsEditingTitle(false)
        if (onTitleUpdate) {
          onTitleUpdate(trimmedTitle)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update project title')
        setEditedTitle(projectTitle || '')
      }
    } catch (error) {
      console.error('Error updating project title:', error)
      toast.error('Failed to update project title')
      setEditedTitle(projectTitle || '')
    } finally {
      setIsSavingTitle(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingTitle(false)
    setEditedTitle(projectTitle || '')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  if (!projectTitle) {
    return null
  }

  return (
    <div className="flex justify-center  border-b min-h-[50px] items-center">
      {isEditingTitle ? (
        <div className="flex items-center gap-2 max-w-[400px] w-full">
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
            autoFocus
            disabled={isSavingTitle}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleSaveTitle}
            disabled={isSavingTitle || !editedTitle.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleCancelEdit}
            disabled={isSavingTitle}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <h2
          className="text-sm font-medium text-muted-foreground truncate max-w-[300px] cursor-pointer hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
          onClick={() => projectId && setIsEditingTitle(true)}
          title="Click to edit project title"
        >
          {projectTitle}
        </h2>
      )}
    </div>
  )
}
