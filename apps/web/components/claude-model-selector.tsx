'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CLAUDE_MODELS, getClaudeModelById } from '@/lib/claude-models'
import { Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClaudeModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  disabled?: boolean
  compact?: boolean
}

export function ClaudeModelSelector({
  value,
  onChange,
  disabled = false,
  compact = false,
}: ClaudeModelSelectorProps) {
  const currentModel = getClaudeModelById(value)

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          compact
            ? 'h-10 border border-input text-xs border-gray-200 bg-background shadow-sm hover:bg-accent hover:text-accent-foreground'
            : 'h-12 w-[200px]'
        )}
      >
        <div className="flex items-center gap-2 ">
          <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Select model">
            {currentModel?.name || 'Select model'}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {CLAUDE_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex flex-col">
              <span className="font-medium">{model.name}</span>
              <span className="text-xs text-muted-foreground">
                {model.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
