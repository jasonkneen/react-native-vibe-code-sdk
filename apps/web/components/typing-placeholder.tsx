'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface TypingPlaceholderProps {
  placeholders: string[]
  speed?: number
  deleteSpeed?: number
  pauseTime?: number
  containerStyle?: React.CSSProperties
  inputStyle?: React.CSSProperties
}

export function TypingPlaceholder({
  placeholders,
  speed = 50,
  deleteSpeed = 30,
  pauseTime = 1500,
  containerStyle,
  inputStyle,
}: TypingPlaceholderProps) {
  const [displayText, setDisplayText] = useState('')
  const indexRef = useRef(0)
  const phaseRef = useRef<'typing' | 'pausing' | 'deleting'>('typing')
  const charRef = useRef(0)

  useEffect(() => {
    if (!placeholders || placeholders.length === 0) return

    let timeoutId: ReturnType<typeof setTimeout>

    const tick = () => {
      const currentPlaceholder = placeholders[indexRef.current]
      if (!currentPlaceholder) {
        indexRef.current = 0
        timeoutId = setTimeout(tick, speed)
        return
      }

      if (phaseRef.current === 'typing') {
        if (charRef.current < currentPlaceholder.length) {
          charRef.current++
          setDisplayText(currentPlaceholder.slice(0, charRef.current))
          timeoutId = setTimeout(tick, speed)
        } else {
          phaseRef.current = 'pausing'
          timeoutId = setTimeout(tick, pauseTime)
        }
      } else if (phaseRef.current === 'pausing') {
        phaseRef.current = 'deleting'
        timeoutId = setTimeout(tick, deleteSpeed)
      } else if (phaseRef.current === 'deleting') {
        if (charRef.current > 0) {
          charRef.current--
          setDisplayText(currentPlaceholder.slice(0, charRef.current))
          timeoutId = setTimeout(tick, deleteSpeed)
        } else {
          indexRef.current = (indexRef.current + 1) % placeholders.length
          phaseRef.current = 'typing'
          timeoutId = setTimeout(tick, speed)
        }
      }
    }

    tick()

    return () => clearTimeout(timeoutId)
  }, [placeholders, speed, deleteSpeed, pauseTime])

  return (
    <div style={containerStyle}>
      <input
        readOnly
        tabIndex={-1}
        value=""
        placeholder={displayText}
        style={{
          ...inputStyle,
          cursor: 'default',
        }}
      />
    </div>
  )
}
