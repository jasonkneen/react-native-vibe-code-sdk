declare module 'react-placeholder-typing' {
  import { FC } from 'react'

  interface PlaceholderTypingProps {
    content: string[]
    typingInterval?: number
    deletingInterval?: number
    pauseInterval?: number
    className?: string
    [key: string]: unknown
  }

  const PlaceholderTyping: FC<PlaceholderTypingProps>
  export default PlaceholderTyping
}
