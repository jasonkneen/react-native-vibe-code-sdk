/**
 * useHoverSystem hook - Mobile stub implementation
 *
 * This is a no-op implementation for mobile platforms.
 * The web implementation is in useHoverSystem.web.ts
 */

import type { HoverSystemOptions, HoverSystemResult } from '../types'

export const useHoverSystem = ({
  enabled,
}: HoverSystemOptions): HoverSystemResult => {
  return {
    hoveredElement: null,
    isEnabled: enabled,
  }
}
