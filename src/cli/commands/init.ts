import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { createProject } from '../utils/project-creator.js';
import { getTemplates } from '../templates/index.js';

export const init = new Command('init')
  .description('Initialize a new mcpresso project')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('-t, --template <template>', 'Template to use')
  .option('-n, --name <name>', 'Project name')
  .option('--oauth', 'Enable OAuth 2.1')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🚀 Welcome to mcpresso!'));
      console.log(chalk.gray('Let\'s create your MCP server together.\n'));

      // Get project details
      const answers = await getProjectDetails(options);
      
      // Create the project
      await createProject(answers);
      
      // Show success message
      showSuccessMessage(answers);
      
    } catch (error) {
      console.error(chalk.red('❌ Error creating project:'), error);
      process.exit(1);
    }
  });

async function getProjectDetails(options: any) {
  const templates = getTemplates();
  
  if (options.yes) {
    return {
      template: options.template || 'vercel',
      name: options.name || 'my-mcpresso-server',
      authType: options.oauth ? 'oauth' : (options.authType || 'none'),
      oauth: options.oauth || false,
      token: options.token || false,
      description: 'A mcpresso MCP server'
    };
  }

  const questions = [
    {
      type: 'list',
      name: 'template',
      message: 'Choose a deployment template:',
      choices: templates.map(t => ({
        name: `${t.name} - ${t.description}`,
        value: t.id
      })),
      default: options.template || 'vercel'
    },
    {
      type: 'input',
      name: 'name',
      message: 'What\'s your project name?',
      default: options.name || 'my-mcpresso-server',
      validate: (input: string) => {
        if (!input.trim()) return 'Project name is required';
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Project name must be lowercase with only letters, numbers, and hyphens';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Describe your project:',
      default: 'A mcpresso MCP server'
    },
    {
      type: 'list',
      name: 'authType',
      message: 'Choose authentication type:',
      choices: [
        { name: 'None - No authentication', value: 'none' },
        { name: 'OAuth 2.1 - Full OAuth flow', value: 'oauth' },
        { name: 'Bearer Token - Simple token-based auth', value: 'token' }
      ],
      default: options.authType || 'none'
    },
    {
      type: 'confirm',
      name: 'git',
      message: 'Initialize git repository?',
      default: true
    },
    {
      type: 'confirm',
      name: 'install',
      message: 'Install dependencies now?',
      default: true
    }
  ];

  const answers = await inquirer.prompt(questions);
  
  // Set oauth and token flags based on authType
  return {
    ...answers,
    oauth: answers.authType === 'oauth',
    token: answers.authType === 'token'
  };
}

function showSuccessMessage(answers: any) {
  console.log('\n' + chalk.green.bold('✅ Project created successfully!'));
  console.log(chalk.gray('─'.repeat(50)));
  
  console.log(chalk.blue.bold('\n📁 Project structure:'));
  console.log(`  ${answers.name}/`);
  console.log(`  ├── src/`);
  console.log(`  │   ├── server.ts`);
  console.log(`  │   └── resources/`);
  console.log(`  ├── package.json`);
  console.log(`  └── README.md`);
  
  console.log(chalk.blue.bold('\n🚀 Next steps:'));
  console.log(`  cd ${answers.name}`);
  
  if (!answers.install) {
    console.log('  npm install');
  }
  
  console.log('  npm run dev          # Start development server');
  console.log('  npm run deploy       # Deploy to production');
  
  console.log(chalk.blue.bold('\n📚 Documentation:'));
  console.log('  https://github.com/granular-software/mcpresso');
  
  console.log(chalk.gray('\nHappy coding! 🎉'));
} 