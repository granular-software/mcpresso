import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { getTemplate } from '../templates/index.js';

export interface ProjectConfig {
  template: string;
  name: string;
  description: string;
  authType: 'none' | 'oauth' | 'token';
  oauth: boolean;
  token: boolean;
  git: boolean;
  install: boolean;
}

export async function createProject(config: ProjectConfig) {
  const template = getTemplate(config.template);
  if (!template) {
    throw new Error(`Unknown template: ${config.template}`);
  }

  const projectPath = path.resolve(config.name);
  
  console.log(chalk.blue(`\n📁 Creating project: ${config.name}`));
  console.log(chalk.gray(`Template: ${template.name}`));

  // Create project directory
  await fs.mkdir(projectPath, { recursive: true });
  
  // Create project structure
  await createProjectStructure(projectPath);
  
  // Generate files using template
  await generateProjectFiles(projectPath, config, template);
  
  // Initialize git if requested
  if (config.git) {
    await initializeGit(projectPath);
  }
  
  // Install dependencies if requested
  if (config.install) {
    await installDependencies(projectPath);
  }
}

async function createProjectStructure(projectPath: string) {
  const dirs = [
    'src',
    'src/resources',
    'src/auth',
    'dist',
    'docs'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(path.join(projectPath, dir), { recursive: true });
  }
}

async function generateProjectFiles(projectPath: string, config: ProjectConfig, template: any) {
  console.log(chalk.gray('  Generating files...'));
  
  // Generate package.json using template
  const packageJson = {
    name: config.name,
    version: '1.0.0',
    description: config.description,
    main: 'dist/server.js',
    type: 'module',
    scripts: template.getScripts(),
    dependencies: template.getDependencies(),
    devDependencies: template.getDevDependencies(),
    keywords: ['mcp', 'mcpresso', 'api', 'server'],
    license: 'MIT'
  };
  await fs.writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Generate files using template
  const templateFiles = await template.generateFiles(config);
  for (const [filePath, content] of Object.entries(templateFiles)) {
    const fullPath = path.join(projectPath, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }
  
  // Generate .gitignore
  const gitignore = generateGitignore();
  await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
  
  // Generate tsconfig.json
  const tsconfig = generateTsConfig();
  await fs.writeFile(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );
}

async function initializeGit(projectPath: string) {
  try {
    console.log(chalk.gray('  Initializing git repository...'));
    execSync('git init', { cwd: projectPath, stdio: 'ignore' });
    execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'ignore' });
  } catch (error) {
    console.log(chalk.yellow('  Warning: Could not initialize git repository'));
  }
}

async function installDependencies(projectPath: string) {
  try {
    console.log(chalk.gray('  Installing dependencies...'));
    execSync('npm install', { cwd: projectPath, stdio: 'inherit' });
  } catch (error) {
    console.log(chalk.yellow('  Warning: Could not install dependencies'));
    console.log(chalk.gray('  Run "npm install" manually to install dependencies'));
  }
}

function generateGitignore(): string {
  return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.next/
.vercel/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;
}

function generateTsConfig(): any {
  return {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "node",
      "allowSyntheticDefaultImports": true,
      "esModuleInterop": true,
      "allowJs": true,
      "strict": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "preserve",
      "incremental": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": [
      "src/**/*",
      "**/*.ts",
      "**/*.tsx"
    ],
    "exclude": [
      "node_modules",
      "dist"
    ]
  };
} 