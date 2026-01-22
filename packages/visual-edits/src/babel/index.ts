/**
 * Babel plugin exports for visual-edits package.
 *
 * The babel plugin adds unique IDs and metadata to JSX elements,
 * enabling visual element selection in the preview.
 *
 * @example
 * ```js
 * // In babel.config.js
 * module.exports = function (api) {
 *   api.cache(true)
 *   return {
 *     presets: ['babel-preset-expo'],
 *     plugins: [
 *       ['@react-native-vibe-code/visual-edits/babel', { platform: 'web' }]
 *     ]
 *   }
 * }
 * ```
 */

// Re-export the babel plugin path for easy reference
export const babelPluginPath = require.resolve('./plugin.js')

// Export plugin metadata
export const pluginName = 'babel-plugin-visual-edits'
export const pluginDescription = 'Adds unique IDs and metadata to JSX elements for visual editing'

/**
 * Plugin options interface
 */
export interface VisualEditsBabelPluginOptions {
  /** Platform to target ('web' | 'ios' | 'android') - plugin only runs for 'web' */
  platform?: string
}
