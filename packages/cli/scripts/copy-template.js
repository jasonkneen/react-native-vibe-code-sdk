#!/usr/bin/env node
const fs = require('fs-extra')
const path = require('path')

const templateSource = path.resolve(__dirname, '..', '..', 'sandbox', 'local-expo-app')
const templateDest = path.resolve(__dirname, '..', 'templates', 'expo-app')

const ignoredDirs = ['node_modules', '.expo', 'dist', '.git']
const ignoredFiles = ['bun.lock', 'pnpm-lock.yaml', 'package-lock.json']

async function copyTemplate() {
  console.log('Copying template from:', templateSource)
  console.log('Copying template to:', templateDest)

  if (!fs.existsSync(templateSource)) {
    console.error('Template source not found:', templateSource)
    process.exit(1)
  }

  await fs.ensureDir(templateDest)

  await fs.copy(templateSource, templateDest, {
    filter: (src) => {
      const basename = path.basename(src)
      if (ignoredDirs.includes(basename) || ignoredFiles.includes(basename)) {
        return false
      }
      if (src.includes('.claude/settings.local.json')) {
        return false
      }
      return true
    },
  })

  const packageJsonPath = path.join(templateDest, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath)
    packageJson.name = 'rnvibecode-template'
    packageJson.private = true
    delete packageJson.scripts?.['test:deploy']
    delete packageJson.scripts?.['test:deploy:project']
    delete packageJson.scripts?.['start:ngrok']
    delete packageJson.scripts?.['start:no-ci']
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
  }

  console.log('Template copied successfully!')
}

copyTemplate().catch((err) => {
  console.error('Error copying template:', err)
  process.exit(1)
})
