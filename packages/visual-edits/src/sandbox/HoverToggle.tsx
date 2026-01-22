/**
 * HoverToggle component
 *
 * UI toggle switch to enable/disable hover inspector mode.
 * Only renders on web platform.
 */

import React from 'react'
import { View, Text, Switch, StyleSheet, Platform } from 'react-native'
import type { HoverToggleProps } from '../types'

/**
 * Optional theme color hook type.
 * If using with Expo, you can pass your own useThemeColor implementation.
 */
export interface ThemeColorHook {
  (props: Record<string, unknown>, colorName: string): string
}

export interface HoverToggleWithThemeProps extends HoverToggleProps {
  /** Optional theme color hook for styling */
  useThemeColor?: ThemeColorHook
}

/**
 * Toggle switch for enabling/disabling the hover inspector.
 * Only renders on web platform.
 *
 * @example
 * ```tsx
 * import { HoverToggle } from '@react-native-vibe-code/visual-edits/sandbox'
 * import { useThemeColor } from '@/hooks/useThemeColor'
 *
 * function App() {
 *   const [enabled, setEnabled] = useState(false)
 *   return (
 *     <HoverToggle
 *       enabled={enabled}
 *       onToggle={setEnabled}
 *       useThemeColor={useThemeColor}
 *     />
 *   )
 * }
 * ```
 */
export function HoverToggle({
  enabled,
  onToggle,
  useThemeColor,
}: HoverToggleWithThemeProps) {
  // Use theme colors if hook is provided, otherwise use defaults
  const textColor = useThemeColor?.({}, 'text') ?? '#000000'
  const backgroundColor = useThemeColor?.({}, 'background') ?? '#ffffff'

  if (Platform.OS !== 'web') {
    return null
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.label, { color: textColor }]}>Hover Inspector</Text>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: '#767577', true: '#ff6b6b' }}
        thumbColor={enabled ? '#ff0000' : '#f4f3f4'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  label: {
    marginRight: 10,
    fontSize: 14,
    fontWeight: '600',
  },
})
