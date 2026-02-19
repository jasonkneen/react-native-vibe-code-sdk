import { defineConfig } from 'drizzle-kit'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load DATABASE_URL from apps/web/.env.local when not already in environment
// (needed when running drizzle-kit directly inside this package)
if (!process.env.DATABASE_URL) {
  const candidates = [
    resolve(__dirname, '../../apps/web/.env.local'),
    resolve(__dirname, '../../.env.local'),
    resolve(__dirname, '.env.local'),
    resolve(__dirname, '.env'),
  ]
  for (const envPath of candidates) {
    try {
      const content = readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
        if (match) {
          const [, key, value] = match
          if (!process.env[key]) {
            process.env[key] = value.replace(/^["']|["']$/g, '')
          }
        }
      }
      if (process.env.DATABASE_URL) break
    } catch {
      // file doesn't exist — try next
    }
  }
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
})
