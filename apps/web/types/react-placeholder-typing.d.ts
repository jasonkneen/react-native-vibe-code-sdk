declare module 'react-placeholder-typing' {
  import { FC, CSSProperties } from 'react'

  interface PlaceholderTypingProps {
    placeholders?: string[]
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    renderIcon?: () => React.ReactNode
    fontFamily?: string
    containerStyle?: CSSProperties
    inputStyle?: CSSProperties
    speed?: number
    [key: string]: unknown
  }

  const PlaceholderTyping: FC<PlaceholderTypingProps>
  export default PlaceholderTyping
}
