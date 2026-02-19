/**
 * Global Vitest setup file.
 *
 * Registers a CJS `require()` hook for `.ts` files using esbuild so that
 * production code which calls `require('./some/module')` (without a .ts
 * extension) can resolve TypeScript source files at test time.
 *
 * Also patches Module._resolveFilename to try `.ts` extension as fallback,
 * so transitive imports inside required .ts files also resolve correctly.
 */
import Module from 'module'
import fs from 'fs'
import { createRequire } from 'module'

const localRequire = createRequire(import.meta.url)

type ModuleInternal = {
  _extensions: Record<string, (m: NodeJS.Module, filename: string) => void>
  _resolveFilename(
    request: string,
    parent: NodeJS.Module | null,
    isMain: boolean,
    options?: object
  ): string
}

const Mod = Module as unknown as ModuleInternal

// Dynamically locate esbuild (it's a transitive dep of vitest)
let transformSync: ((src: string, opts: { loader: string; format?: string }) => { code: string }) | null = null
try {
  const esbuild = localRequire('esbuild')
  transformSync = esbuild.transformSync
} catch {
  // esbuild not available — ts require hook won't be registered
}

if (transformSync) {
  const _transform = transformSync

  // 1. Patch _resolveFilename to fall back to the .ts extension when a module
  //    cannot be found by its original name.
  const originalResolveFilename = Mod._resolveFilename
  Mod._resolveFilename = function (request, parent, isMain, options) {
    try {
      return originalResolveFilename.call(this, request, parent, isMain, options)
    } catch (err) {
      // Try appending .ts only for relative paths that look like bare module ids
      if (!request.endsWith('.ts') && !request.endsWith('.js')) {
        try {
          return originalResolveFilename.call(
            this,
            request + '.ts',
            parent,
            isMain,
            options
          )
        } catch {
          // fall through to original error
        }
      }
      throw err
    }
  }

  // 2. Register .ts extension handler — transpile with esbuild to CJS, then compile.
  Mod._extensions['.ts'] = function (m: NodeJS.Module, filename: string) {
    const src = fs.readFileSync(filename, 'utf8')
    const result = _transform(src, { loader: 'ts', format: 'cjs' })
    ;(m as unknown as { _compile(code: string, filename: string): void })._compile(
      result.code,
      filename
    )
  }
}
