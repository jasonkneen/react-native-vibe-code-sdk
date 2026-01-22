import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'
import prompts from 'prompts'
import { exec } from 'child_process'
import { promisify } from 'util'
import { setupClaudeCode } from './setup.js'

const execAsync = promisify(exec)

interface CreateOptions {
  convex?: boolean
  skipInstall?: boolean
}

async function findTemplatePath(): Promise<string | null> {
  const possiblePaths = [
    path.resolve(__dirname, '..', '..', 'templates', 'expo-app'),
    path.resolve(__dirname, '..', 'templates', 'expo-app'),
    path.resolve(__dirname, '..', '..', '..', 'sandbox', 'local-expo-app'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'package.json'))) {
      return p
    }
  }

  return null
}

export async function createProject(projectName?: string, options: CreateOptions = {}) {
  console.log()
  console.log(chalk.bold.cyan('  React Native Vibe Code'))
  console.log(chalk.dim('  AI-powered mobile app development with Claude Code'))
  console.log()

  let name = projectName

  if (!name) {
    const response = await prompts({
      type: 'text',
      name: 'name',
      message: 'What is your project name?',
      initial: 'my-app',
      validate: (value) => {
        if (!value) return 'Project name is required'
        if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value)) {
          return 'Project name must start with a letter and contain only letters, numbers, hyphens, and underscores'
        }
        return true
      },
    })

    if (!response.name) {
      console.log(chalk.yellow('Cancelled'))
      process.exit(0)
    }

    name = response.name
  }

  const projectPath = path.resolve(process.cwd(), name!)

  if (fs.existsSync(projectPath)) {
    const response = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Directory ${name} already exists. Overwrite?`,
      initial: false,
    })

    if (!response.overwrite) {
      console.log(chalk.yellow('Cancelled'))
      process.exit(0)
    }

    await fs.remove(projectPath)
  }

  let enableConvex = options.convex

  if (enableConvex === undefined) {
    const response = await prompts({
      type: 'confirm',
      name: 'convex',
      message: 'Enable Convex backend integration?',
      initial: false,
    })
    enableConvex = response.convex
  }

  const spinner = ora('Creating project...').start()

  try {
    const templatePath = await findTemplatePath()

    if (!templatePath) {
      spinner.text = 'Creating via create-expo-app...'
      await execAsync(`npx create-expo-app@latest ${name} --template blank-typescript`, {
        cwd: process.cwd(),
      })
      spinner.succeed('Created base Expo project')
    } else {
      await fs.copy(templatePath, projectPath, {
        filter: (src) => {
          const basename = path.basename(src)
          const ignoredDirs = ['node_modules', '.expo', 'dist', '.git']
          const ignoredFiles = ['bun.lock', 'pnpm-lock.yaml', 'package-lock.json']
          return !ignoredDirs.includes(basename) && !ignoredFiles.includes(basename)
        },
      })
      spinner.succeed('Copied React Native Vibe Code template')
    }

    const packageJsonPath = path.join(projectPath, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath)
      packageJson.name = name
      packageJson.private = true
      delete packageJson.scripts?.['test:deploy']
      delete packageJson.scripts?.['test:deploy:project']
      delete packageJson.scripts?.['start:ngrok']
      delete packageJson.scripts?.['start:no-ci']
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
    }

    const originalCwd = process.cwd()
    process.chdir(projectPath)

    spinner.start('Setting up Claude Code integration...')
    await setupClaudeCode({ convex: enableConvex, detect: false })
    spinner.succeed('Claude Code integration configured')

    if (!options.skipInstall) {
      spinner.start('Installing dependencies...')
      try {
        await execAsync('pnpm install', { cwd: projectPath })
        spinner.succeed('Dependencies installed with pnpm')
      } catch {
        try {
          await execAsync('npm install', { cwd: projectPath })
          spinner.succeed('Dependencies installed with npm')
        } catch {
          spinner.warn('Could not install dependencies automatically')
          console.log(chalk.dim('  Run: cd ' + name + ' && npm install'))
        }
      }
    }

    process.chdir(originalCwd)

    console.log()
    console.log(chalk.green.bold('  Project created successfully!'))
    console.log()
    console.log(chalk.bold('  Next steps:'))
    console.log()
    console.log(chalk.cyan(`    cd ${name}`))
    if (options.skipInstall) {
      console.log(chalk.cyan('    npm install'))
    }
    console.log(chalk.cyan('    npx expo start'))
    console.log()
    console.log(chalk.bold('  To use Claude Code:'))
    console.log()
    console.log(chalk.cyan('    claude'))
    console.log()
    console.log(chalk.dim('  Claude will automatically read your CLAUDE.md for project context'))
    console.log()

    if (enableConvex) {
      console.log(chalk.bold('  Convex Setup:'))
      console.log()
      console.log(chalk.cyan('    npx convex dev'))
      console.log()
      console.log(chalk.dim('  This will set up your Convex backend'))
      console.log()
    }

  } catch (error) {
    spinner.fail('Failed to create project')
    throw error
  }
}
