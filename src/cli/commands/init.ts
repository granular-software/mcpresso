import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import fsSync from 'fs';
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
      console.log(chalk.cyan('✨ Choose from our production-ready templates:'));
      console.log(chalk.gray('   • Docker + OAuth + PostgreSQL (Production)'));
      console.log(chalk.gray('   • Docker + OAuth + SQLite (Single User)'));
      console.log(chalk.gray('   • Express + OAuth + SQLite (Development)'));
      console.log(chalk.gray('   • Express + No Auth (Public APIs)'));
      console.log('');
      console.log(chalk.yellow('💡 Each template includes:'));
      console.log(chalk.gray('   • Complete MCP server setup'));
      console.log(chalk.gray('   • TypeScript configuration'));
      console.log(chalk.gray('   • Development & production builds'));
      console.log(chalk.gray('   • Database initialization scripts'));
      console.log(chalk.gray('   • Comprehensive documentation'));
      console.log('');

      // Get project details
      const answers = await getProjectDetails(options);
      
      // Create the project
      await createProject(answers);
      
      // Show success message
      showSuccessMessage(answers);
      
    } catch (error) {
      console.log(chalk.red.bold('\n❌ Error creating project'));
      console.log(chalk.gray('─'.repeat(40)));
      console.error(chalk.red('Details:'), error);
      console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
      console.log(chalk.gray('   • Check your internet connection'));
      console.log(chalk.gray('   • Ensure you have write permissions'));
      console.log(chalk.gray('   • Try a different project name'));
      console.log(chalk.gray('   • Check the template URL is valid'));
      console.log(chalk.gray('\nFor more help: https://github.com/granular-software/mcpresso'));
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
    // Resolve template ID to URL if needed
    let templateUrl = options.template || 'template-express-no-auth';
    if (!templateUrl.includes('github.com')) {
      const templates = await getAvailableTemplates();
      const template = templates.find(t => t.id === templateUrl);
      if (template) {
        templateUrl = template.url;
      }
    }
    
    return {
      templateUrl,
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
    message: chalk.blue.bold('🎯 Choose a template:'),
    choices: templateChoices
  }]);

  let templateUrl = templateAnswer.template;
  
  // If custom template selected, ask for URL
  if (templateUrl === 'custom') {
    const customUrlAnswer = await inquirer.prompt([{
      type: 'input',
      name: 'customUrl',
      message: chalk.blue.bold('🔗 Enter GitHub repository URL:'),
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
      message: chalk.blue.bold('📝 What\'s your project name?'),
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
      message: chalk.blue.bold('📖 Describe your project:'),
      default: options.description || 'A mcpresso MCP server'
    },
    {
      type: 'confirm',
      name: 'install',
      message: chalk.blue.bold('📦 Install dependencies now?'),
      default: options.install !== false
    },
    {
      type: 'confirm',
      name: 'git',
      message: chalk.blue.bold('🔧 Initialize git repository?'),
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

  console.log(chalk.blue.bold('\n🚀 Creating your project...'));
  console.log(chalk.gray('─'.repeat(40)));

  try {
    // Clone the template
    console.log(chalk.blue('📥 Cloning template...'));
    await cloneTemplate(answers.templateUrl, targetDir);
    console.log(chalk.green('✅ Template cloned'));
    
    // Configure the template
    console.log(chalk.blue('⚙️  Configuring template...'));
    await configureTemplate(targetDir, {
      name: answers.name,
      description: answers.description
    });
    console.log(chalk.green('✅ Template configured'));
    
    // Install dependencies if requested
    if (answers.install) {
      console.log(chalk.blue('📦 Installing dependencies...'));
      await installDependencies(targetDir);
      console.log(chalk.green('✅ Dependencies installed'));
    }
    
    // Initialize git if requested
    if (answers.git) {
      try {
        console.log(chalk.blue('🔧 Initializing git repository...'));
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
    
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.green.bold('✨ Project creation completed!'));
    
  } catch (error) {
    console.log(chalk.red.bold('\n❌ Project creation failed'));
    console.log(chalk.gray('─'.repeat(40)));
    throw error; // Re-throw to be caught by the main error handler
  }
}

function showSuccessMessage(answers: any) {
  console.log('\n' + chalk.green.bold('🎉 Project created successfully!'));
  console.log(chalk.gray('═'.repeat(60)));
  
  console.log(chalk.blue.bold('\n📁 Project structure:'));
  console.log(`  ${answers.name}/`);
  console.log(`  ├── src/`);
  console.log(`  │   ├── server.ts`);
  console.log(`  │   ├── auth/`);
  console.log(`  │   └── resources/`);
  console.log(`  ├── package.json`);
  console.log(`  ├── env.example`);
  console.log(`  └── README.md`);
  
  console.log(chalk.blue.bold('\n🚀 Quick Start:'));
  console.log(`  cd ${answers.name}`);
  
  if (!answers.install) {
    console.log('  npm install');
  }
  
  console.log('  cp env.example .env');
  console.log('  # Edit .env with your configuration');
  
  // Show template-specific instructions
  showTemplateSpecificInstructions(answers.name);
  
  console.log(chalk.blue.bold('\n🔧 Development:'));
  console.log('  npm run dev          # Start development server');
  console.log('  npm run build        # Build for production');
  
  console.log(chalk.blue.bold('\n📚 Next Steps:'));
  console.log('  📖 README.md         # Template-specific guide');
  console.log('  🌐 Documentation     # https://github.com/granular-software/mcpresso');
  console.log('  💬 Community         # GitHub Discussions');
  
  console.log(chalk.gray('\n' + '═'.repeat(60)));
  console.log(chalk.yellow.bold('💡 Pro tip: Check the README.md for detailed setup instructions!'));
  console.log(chalk.gray('\nHappy coding! 🎉'));
}

function showTemplateSpecificInstructions(projectName: string) {
  // Try to detect template type from project files
  const projectPath = path.join(process.cwd(), projectName);
  
  try {
    // Check for Docker files
    const hasDocker = fsSync.existsSync(path.join(projectPath, 'Dockerfile')) || 
                     fsSync.existsSync(path.join(projectPath, 'docker-compose.yml'));
    
    // Check for OAuth (look for auth directory)
    const hasOAuth = fsSync.existsSync(path.join(projectPath, 'src/auth'));
    
    // Check for database type (look for scripts)
    const hasPostgresScripts = fsSync.existsSync(path.join(projectPath, 'scripts/init-db.js'));
    const hasSqliteScripts = fsSync.existsSync(path.join(projectPath, 'scripts/setup-db.sh'));
    const hasUserCreation = fsSync.existsSync(path.join(projectPath, 'scripts/create-user.js'));
    
    // Determine template type with priority
    let templateType = 'unknown';
    let templateName = '';
    
    if (hasDocker && hasOAuth && hasPostgresScripts) {
      templateType = 'docker-oauth-postgresql';
      templateName = '🐳 Docker + OAuth + PostgreSQL';
    } else if (hasDocker && hasOAuth && hasSqliteScripts) {
      templateType = 'docker-oauth-sqlite';
      templateName = '🐳 Docker + OAuth + SQLite (Single User)';
    } else if (!hasDocker && hasOAuth && hasSqliteScripts) {
      templateType = 'express-oauth-sqlite';
      templateName = '🚀 Express + OAuth + SQLite';
    } else if (!hasDocker && !hasOAuth) {
      templateType = 'express-no-auth';
      templateName = '🚀 Express + No Auth';
    } else if (hasOAuth) {
      templateType = 'generic-oauth';
      templateName = '🔐 OAuth Server';
    }
    
    // Show template-specific setup
    if (templateType !== 'unknown') {
      console.log(chalk.blue.bold(`\n${templateName} Setup:`));
      
      // Common OAuth setup
      if (hasOAuth) {
        console.log('  npm run secret:generate    # Generate JWT secret');
        console.log('  npm run db:init            # Initialize database');
      }
      
      // Template-specific commands
      switch (templateType) {
        case 'docker-oauth-postgresql':
          if (hasUserCreation) {
            console.log('  npm run user:create "John Doe" "john@example.com" "password123"');
          }
          console.log('  npm run docker:compose     # Start with Docker Compose');
          break;
          
        case 'docker-oauth-sqlite':
          console.log('  # Set your API_KEY in .env');
          if (hasUserCreation) {
            console.log('  npm run user:create "testuser" "test@example.com" "password123"');
          }
          console.log('  npm run docker:compose     # Start with Docker Compose');
          break;
          
        case 'express-oauth-sqlite':
          if (hasUserCreation) {
            console.log('  npm run user:create "testuser" "test@example.com" "password123"');
          }
          break;
          
        case 'express-no-auth':
          console.log('  # No authentication required - ready to go!');
          break;
      }
      
      // Show user creation details if available
      if (hasOAuth && hasUserCreation) {
        console.log(chalk.blue.bold('\n👤 Create Test User:'));
        
        if (templateType === 'docker-oauth-postgresql') {
          console.log('  # PostgreSQL template - requires name, email, and password:');
          console.log('  npm run user:create "John Doe" "john@example.com" "password123"');
        } else if (templateType === 'express-oauth-sqlite') {
          console.log('  # SQLite template - accepts optional parameters:');
          console.log('  npm run user:create                    # Uses defaults');
          console.log('  npm run user:create "testuser" "test@example.com" "password123"');
        } else {
          console.log('  npm run user:create "username" "email@example.com" "password"');
        }
        
        console.log('  # After creating a user, you can log in through the OAuth flow');
      }
      
      // Show database info for OAuth templates
      if (hasOAuth) {
        console.log(chalk.blue.bold('\n🗄️  Database:'));
        if (templateType === 'docker-oauth-postgresql') {
          console.log('  # PostgreSQL with UUID primary keys, foreign key constraints');
        } else if (templateType === 'docker-oauth-sqlite' || templateType === 'express-oauth-sqlite') {
          console.log('  # SQLite file-based storage, no external database required');
        }
        console.log('  # Creates users, OAuth clients, tokens, and example resources');
      }
    }
    
  } catch (error) {
    // Fallback to generic instructions
    console.log(chalk.blue.bold('\n🔧 Setup Commands:'));
    console.log('  npm run secret:generate    # Generate JWT secret (if OAuth)');
    console.log('  npm run db:init            # Initialize database (if applicable)');
    console.log('  npm run user:create "username" "email@example.com" "password"');
  }
} 