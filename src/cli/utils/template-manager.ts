import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'docker' | 'express' | 'cloud';
  authType: 'oauth' | 'token' | 'none';
  complexity: 'easy' | 'medium' | 'hard';
  url: string;
  features?: string[];
  requirements?: string[];
  envVars?: Array<{
    name: string;
    description: string;
    required?: boolean;
    default?: string;
  }>;
}

// Official templates from granular-software organization
const OFFICIAL_TEMPLATES: Template[] = [
  {
    id: 'template-docker-oauth-postgresql',
    name: 'Docker + OAuth2.1 + PostgreSQL',
    description: 'Production-ready MCP server with OAuth2.1 authentication and PostgreSQL database',
    category: 'docker',
    authType: 'oauth',
    complexity: 'medium',
    url: 'https://github.com/granular-software/template-docker-oauth-postgresql',
    features: [
      'OAuth2.1 authentication',
      'PostgreSQL database',
      'Docker containerization',
      'Production-ready setup',
      'User management',
      'Token refresh'
    ],
    requirements: [
      'Docker and Docker Compose',
      'PostgreSQL database (local or cloud)'
    ],
    envVars: [
      { name: 'DATABASE_URL', description: 'PostgreSQL connection string', required: true },
      { name: 'JWT_SECRET', description: 'Secret key for JWT tokens', required: true },
      { name: 'SERVER_URL', description: 'Base URL of your server', required: true }
    ]
  },
  {
    id: 'template-docker-single-user',
    name: 'Docker + Single User (API Key)',
    description: 'Docker-first MCP server with a single user authenticated via API key (no database required)',
    category: 'docker',
    authType: 'oauth',
    complexity: 'easy',
    url: 'https://github.com/granular-software/template-docker-single-user',
    features: [
      'Single user with API key login',
      'OAuth2.1-compatible endpoints',
      'No database required',
      'File-based storage',
      'Docker containerization'
    ],
    requirements: [
      'Docker and Docker Compose'
    ],
    envVars: [
      { name: 'PORT', description: 'Server port', required: false, default: '3000' },
      { name: 'SERVER_URL', description: 'Base URL of your server', required: true },
      { name: 'DATA_DIR', description: 'Directory for API key and OAuth state storage', required: false, default: './data' },
      { name: 'API_KEY_FILE', description: 'Optional path to API key file', required: false }
    ]
  },
  {
    id: 'template-express-oauth-sqlite',
    name: 'Express + OAuth2.1 + SQLite',
    description: 'Simple MCP server with OAuth2.1 authentication using SQLite database',
    category: 'express',
    authType: 'oauth',
    complexity: 'easy',
    url: 'https://github.com/granular-software/template-express-oauth-sqlite',
    features: [
      'OAuth2.1 authentication',
      'SQLite database (file-based)',
      'Express.js server',
      'Development-friendly',
      'User management'
    ],
    requirements: [
      'Node.js 18+',
      'npm or yarn'
    ],
    envVars: [
      { name: 'JWT_SECRET', description: 'Secret key for JWT tokens', required: true },
      { name: 'PORT', description: 'Server port', required: false, default: '3000' },
      { name: 'SERVER_URL', description: 'Base URL of your server', required: true }
    ]
  },
  // {
  //   id: 'template-express-no-auth',
  //   name: 'Express + No Authentication',
  //   description: 'Simple MCP server without authentication for public APIs',
  //   category: 'express',
  //   authType: 'none',
  //   complexity: 'easy',
  //   url: 'https://github.com/granular-software/template-express-no-auth',
  //   features: [
  //     'No authentication required',
  //     'Express.js server',
  //     'Simple setup',
  //     'Perfect for public APIs',
  //     'Development-friendly'
  //   ],
  //   requirements: [
  //     'Node.js 18+',
  //     'npm or yarn'
  //   ],
  //   envVars: [
  //     { name: 'PORT', description: 'Server port', required: false, default: '3000' },
  //     { name: 'SERVER_URL', description: 'Base URL of your server', required: true }
  //   ]
  // },
  // {
  //   id: 'template-express-test',
  //   name: 'Express Test',
  //   description: 'Test Express template',
  //   category: 'express',
  //   authType: 'none',
  //   complexity: 'easy',
  //   url: 'file:///Users/arthurhirel/Documents/joshu/joshu/apps/template-express-test',
  //   features: [
  //     'MCP server',
  //     'TypeScript',
  //     'Production ready'
  //   ],
  //   requirements: [
  //     'Node.js 18+',
  //     'npm or yarn'
  //   ],
  //   envVars: [
  //     { name: 'PORT', description: 'Server port', required: false, default: '3000' },
  //     { name: 'SERVER_URL', description: 'Base URL of your server', required: true }
  //   ]
  // }
];

export async function getAvailableTemplates(): Promise<Template[]> {
  // For now, return official templates
  // In the future, this could fetch from a registry or GitHub API
  return OFFICIAL_TEMPLATES;
}

export async function getTemplateInfo(templateIdOrUrl: string): Promise<Template | null> {
  const templates = await getAvailableTemplates();
  
  // Try to find by ID first
  let template = templates.find(t => t.id === templateIdOrUrl);
  
  // If not found by ID, try to find by URL
  if (!template) {
    template = templates.find(t => t.url === templateIdOrUrl);
  }
  
  // If still not found, it might be a custom template URL
  if (!template && templateIdOrUrl.includes('github.com')) {
    // For custom templates, we'd need to fetch the template.json file
    // For now, return a basic template structure
    return {
      id: 'custom',
      name: 'Custom Template',
      description: 'Custom template from GitHub',
      category: 'express',
      authType: 'none',
      complexity: 'medium',
      url: templateIdOrUrl
    };
  }
  
  return template || null;
}

export async function cloneTemplate(templateUrl: string, targetDir: string): Promise<void> {
  try {
    console.log(chalk.blue(`📥 Cloning template from ${templateUrl}...`));
    
    // Handle local file:// URLs
    if (templateUrl.startsWith('file://')) {
      const localPath = templateUrl.replace('file://', '');
      console.log(chalk.blue(`📁 Copying local template from ${localPath}...`));
      
      // Copy the directory
      await fs.cp(localPath, targetDir, { recursive: true });
      
      // Remove any .git directory if it exists
      try {
        await fs.rm(path.join(targetDir, '.git'), { recursive: true, force: true });
      } catch (error) {
        // .git directory might not exist, ignore
      }
      
      console.log(chalk.green('✅ Local template copied successfully'));
      return;
    }
    
    // Clone the repository
    execSync(`git clone ${templateUrl} ${targetDir}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Remove .git directory to make it a fresh repository
    await fs.rm(path.join(targetDir, '.git'), { recursive: true, force: true });
    
    console.log(chalk.green('✅ Template cloned successfully'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error cloning template:'), error);
    throw error;
  }
}

export async function configureTemplate(
  targetDir: string, 
  config: {
    name: string;
    description: string;
    author?: string;
    version?: string;
  }
): Promise<void> {
  try {
    console.log(chalk.blue('⚙️  Configuring template...'));
    
    // Read package.json
    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Update package.json
    packageJson.name = config.name;
    packageJson.description = config.description;
    if (config.author) packageJson.author = config.author;
    if (config.version) packageJson.version = config.version;
    
    // Write updated package.json
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    // Replace placeholders in all relevant files
    const filesToProcess = [
      'README.md',
      'src/server.ts',
      'src/auth/oauth.ts',
      'env.example',
      'package.json'
    ];
    
    for (const fileName of filesToProcess) {
      const filePath = path.join(targetDir, fileName);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        let updatedContent = content;
        
        // Replace placeholders
        updatedContent = updatedContent.replace(/{{PROJECT_NAME}}/g, config.name);
        updatedContent = updatedContent.replace(/{{PROJECT_DESCRIPTION}}/g, config.description);
        
        // Only write if content changed
        if (updatedContent !== content) {
          await fs.writeFile(filePath, updatedContent);
          console.log(chalk.gray(`  Updated ${fileName}`));
        }
      } catch (error) {
        // File might not exist, skip silently
        console.log(chalk.gray(`  Skipped ${fileName} (not found)`));
      }
    }
    
    console.log(chalk.green('✅ Template configured successfully'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error configuring template:'), error);
    throw error;
  }
}

export async function installDependencies(targetDir: string): Promise<void> {
  try {
    console.log(chalk.blue('📦 Installing dependencies...'));
    
    // Check if package.json exists
    const packageJsonPath = path.join(targetDir, 'package.json');
    await fs.access(packageJsonPath);
    
    // Install dependencies
    execSync('npm install', { 
      stdio: 'inherit',
      cwd: targetDir
    });
    
    console.log(chalk.green('✅ Dependencies installed successfully'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error installing dependencies:'), error);
    throw error;
  }
} 