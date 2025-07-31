import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { 
  getAvailableTemplates, 
  getTemplateInfo, 
  cloneTemplate, 
  configureTemplate, 
  installDependencies 
} from '../utils/template-manager.js';

export const init = new Command('init')
  .description('Initialize a new mcpresso project from a template')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('-t, --template <template>', 'Template to use (ID or GitHub URL)')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --description <description>', 'Project description')
  .option('--no-install', 'Skip dependency installation')
  .option('--no-git', 'Skip git initialization')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🚀 Welcome to mcpresso v1.0!'));
      console.log(chalk.gray('Let\'s create your MCP server from a template.\n'));

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

async function getProjectDetails(options: any): Promise<{
  templateUrl: string;
  name: string;
  description: string;
  install: boolean;
  git: boolean;
}> {
  if (options.yes) {
    return {
      templateUrl: options.template || 'template-express-no-auth',
      name: options.name || 'my-mcpresso-server',
      description: options.description || 'A mcpresso MCP server',
      install: options.install !== false,
      git: options.git !== false
    };
  }

  // Get available templates
  const templates = await getAvailableTemplates();
  
  // Ask for template selection
  const templateChoices = [
    ...templates.map(t => ({
      name: `${t.name} - ${t.description}`,
      value: t.url
    })),
    new inquirer.Separator(),
    {
      name: 'Custom template URL...',
      value: 'custom'
    }
  ];

  const templateAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'template',
    message: 'Choose a template:',
    choices: templateChoices
  }]);

  let templateUrl = templateAnswer.template;
  
  // If custom template selected, ask for URL
  if (templateUrl === 'custom') {
    const customUrlAnswer = await inquirer.prompt([{
      type: 'input',
      name: 'customUrl',
      message: 'Enter GitHub repository URL:',
      validate: (input: string) => {
        if (!input.trim()) return 'URL is required';
        if (!input.includes('github.com')) return 'Please enter a valid GitHub URL';
        return true;
      }
    }]);
    templateUrl = customUrlAnswer.customUrl;
  }

  // Get project details
  const answers = await inquirer.prompt([
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
      default: options.description || 'A mcpresso MCP server'
    },
    {
      type: 'confirm',
      name: 'install',
      message: 'Install dependencies now?',
      default: options.install !== false
    },
    {
      type: 'confirm',
      name: 'git',
      message: 'Initialize git repository?',
      default: options.git !== false
    }
  ]);

  return {
    templateUrl,
    name: answers.name,
    description: answers.description,
    install: answers.install,
    git: answers.git
  };
}

async function createProject(answers: {
  templateUrl: string;
  name: string;
  description: string;
  install: boolean;
  git: boolean;
}): Promise<void> {
  const targetDir = path.join(process.cwd(), answers.name);
  
  // Check if directory already exists
  try {
    await fs.access(targetDir);
    throw new Error(`Directory "${answers.name}" already exists. Please choose a different name.`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  // Clone the template
  await cloneTemplate(answers.templateUrl, targetDir);
  
  // Configure the template
  await configureTemplate(targetDir, {
    name: answers.name,
    description: answers.description
  });
  
  // Install dependencies if requested
  if (answers.install) {
    await installDependencies(targetDir);
  }
  
  // Initialize git if requested
  if (answers.git) {
    try {
      console.log(chalk.blue('📝 Initializing git repository...'));
      execSync('git init', { stdio: 'inherit', cwd: targetDir });
      execSync('git add .', { stdio: 'inherit', cwd: targetDir });
      execSync('git commit -m "Initial commit from mcpresso template"', { 
        stdio: 'inherit', 
        cwd: targetDir 
      });
      console.log(chalk.green('✅ Git repository initialized'));
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not initialize git repository'));
    }
  }
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
  console.log('  npm run build        # Build for production');
  
  console.log(chalk.blue.bold('\n📚 Documentation:'));
  console.log('  https://github.com/granular-software/mcpresso');
  
  console.log(chalk.gray('\nHappy coding! 🎉'));
} 