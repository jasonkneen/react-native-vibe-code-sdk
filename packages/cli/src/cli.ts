#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import { createProject } from './commands/create.js'
import { setupClaudeCode } from './commands/setup.js'

const program = new Command()

program
  .name('rnvibecode')
  .description('CLI to scaffold React Native Vibe Code projects with Claude Code integration')
  .version('0.0.1')

program
  .command('create')
  .description('Create a new React Native Vibe Code project')
  .argument('[name]', 'Project name')
  .option('--convex', 'Enable Convex backend integration')
  .option('--no-convex', 'Disable Convex backend (default)')
  .option('--skip-install', 'Skip dependency installation')
  .action(async (name, options) => {
    try {
      await createProject(name, options)
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('setup')
  .description('Set up Claude Code configuration for an existing project')
  .option('--convex', 'Enable Convex backend in CLAUDE.md')
  .option('--no-convex', 'Disable Convex backend in CLAUDE.md')
  .option('--detect', 'Auto-detect Convex from project files (default)')
  .action(async (options) => {
    try {
      await setupClaudeCode(options)
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.addHelpText('after', `

${chalk.bold('Getting Started:')}
  ${chalk.cyan('rnvibecode create my-app')}     Create a new project
  ${chalk.cyan('rnvibecode setup')}             Set up Claude Code in existing project

${chalk.bold('Requirements:')}
  This CLI sets up your project for Claude Code development.
  Claude Code must be installed separately.

${chalk.bold('Installing Claude Code:')}
  ${chalk.dim('macOS, Linux, WSL:')}
    curl -fsSL https://claude.ai/install.sh | bash

  ${chalk.dim('Windows PowerShell:')}
    irm https://claude.ai/install.ps1 | iex

  ${chalk.dim('Homebrew:')}
    brew install claude-code

  ${chalk.dim('NPM (global):')}
    npm install -g @anthropic-ai/claude-code

  For more information: ${chalk.blue('https://code.claude.com/')}

${chalk.bold('About:')}
  React Native Vibe Code uses Claude Agent SDK on the cloud.
  This CLI translates that setup for local development with Claude Code.
  You get all the cloud features working locally on your machine!
`)

program.parse()
