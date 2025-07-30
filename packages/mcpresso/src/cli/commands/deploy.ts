import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import fsPromises from 'fs/promises';
import { mkdtempSync } from 'fs';
import path from 'path';
import os from 'os';


export const deploy = new Command('deploy')
  .description('Deploy your mcpresso server to production')
  .option('-p, --platform <platform>', 'Deployment platform')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🚀 Deploying mcpresso server...\n'));

      // Detect platform from package.json
      const platform = await detectPlatform(options.platform);
      
      // Confirm deployment
      if (!options.yes) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Deploy to ${platform.name}?`,
            default: true
          }
        ]);
        
        if (!confirm) {
          console.log(chalk.yellow('Deployment cancelled.'));
          return;
        }
      }

      // Build the project
      console.log(chalk.gray('📦 Building project...'));
      execSync('npm run build', { stdio: 'inherit' });

      // Deploy based on platform
      await deployToPlatform(platform);

      console.log(chalk.green.bold('\n✅ Deployment successful!'));
      console.log(chalk.gray('Your MCP server is now live! 🎉'));

    } catch (error) {
      console.error(chalk.red('❌ Deployment failed:'), error);
      process.exit(1);
    }
  });

async function detectPlatform(specifiedPlatform?: string) {
  if (specifiedPlatform) {
    return getPlatformConfig(specifiedPlatform);
  }

  try {
    const packageJson = JSON.parse(await fsPromises.readFile('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};

    if (scripts.deploy?.includes('vercel')) {
      return getPlatformConfig('vercel');
    } else if (scripts.deploy?.includes('wrangler')) {
      return getPlatformConfig('cloudflare');
    } else if (scripts.deploy?.includes('serverless')) {
      return getPlatformConfig('aws-lambda');
    } else if (scripts.deploy?.includes('docker')) {
      return getPlatformConfig('docker');
    } else {
      // Ask user to choose
      const { platform } = await inquirer.prompt([
        {
          type: 'list',
          name: 'platform',
          message: 'Choose deployment platform:',
          choices: [
            { name: 'Vercel Functions', value: 'vercel' },
            { name: 'Cloudflare Workers', value: 'cloudflare' },
            { name: 'AWS Lambda', value: 'aws-lambda' },
            { name: 'Docker', value: 'docker' },
            { name: 'Express Server', value: 'express' }
          ]
        }
      ]);
      
      return getPlatformConfig(platform);
    }
  } catch (error) {
    console.log(chalk.yellow('Could not detect platform from package.json'));
    const { platform } = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Choose deployment platform:',
        choices: [
          { name: 'Vercel Functions', value: 'vercel' },
          { name: 'Cloudflare Workers', value: 'cloudflare' },
          { name: 'AWS Lambda', value: 'aws-lambda' },
          { name: 'Docker', value: 'docker' },
          { name: 'Express Server', value: 'express' }
        ]
      }
    ]);
    
    return getPlatformConfig(platform);
  }
}

function getPlatformConfig(platform: string) {
  const configs = {
    'vercel': {
      name: 'Vercel Functions',
      command: 'vercel --prod',
      checkCommand: 'vercel --version',
      installCommand: 'npm install -g vercel',
      docs: 'https://vercel.com/docs/functions'
    },
    'cloudflare': {
      name: 'Cloudflare Workers',
      command: 'wrangler deploy',
      checkCommand: 'wrangler --version',
      installCommand: 'npm install -g wrangler',
      docs: 'https://developers.cloudflare.com/workers/'
    },
    'aws-lambda': {
      name: 'AWS Lambda',
      command: 'serverless deploy',
      checkCommand: 'serverless --version',
      installCommand: 'npm install -g serverless',
      docs: 'https://docs.aws.amazon.com/lambda/'
    },
    'docker': {
      name: 'Docker',
      command: 'docker-compose up -d',
      checkCommand: 'docker --version',
      installCommand: 'https://docs.docker.com/get-docker/',
      docs: 'https://docs.docker.com/'
    },
    'express': {
      name: 'Express Server',
      command: 'npm start',
      checkCommand: 'node --version',
      installCommand: null,
      docs: 'https://expressjs.com/'
    }
  };

  return configs[platform as keyof typeof configs] || configs.vercel;
}

async function deployToPlatform(platform: any) {
  console.log(chalk.blue(`🌐 Deploying to ${platform.name}...`));

  // Check if platform CLI is installed
  try {
    execSync(platform.checkCommand, { stdio: 'pipe' });
  } catch (error) {
    console.log(chalk.yellow(`⚠️  ${platform.name} CLI not found.`));
    
    if (platform.installCommand) {
      const { install } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'install',
          message: `Install ${platform.name} CLI?`,
          default: true
        }
      ]);

      if (install) {
        console.log(chalk.gray(`📦 Installing ${platform.name} CLI...`));
        execSync(platform.installCommand, { stdio: 'inherit' });
      } else {
        console.log(chalk.red(`Please install ${platform.name} CLI manually:`));
        console.log(chalk.gray(`  ${platform.installCommand}`));
        console.log(chalk.gray(`  Documentation: ${platform.docs}`));
        process.exit(1);
      }
    } else {
      console.log(chalk.red(`Please install ${platform.name} manually:`));
      console.log(chalk.gray(`  Documentation: ${platform.docs}`));
      process.exit(1);
    }
  }

  // Special handling for Vercel - automatically set up KV storage
  if (platform.name === 'Vercel Functions') {
    await setupVercelStorage();
  }

  // Execute deployment
  console.log(chalk.gray(`🚀 Running: ${platform.command}`));
  execSync(platform.command, { stdio: 'inherit' });
}

async function setupVercelStorage() {
  console.log(chalk.blue('🔧 Setting up Vercel Blob storage...'));
  
  try {
    // Check if we're in a Vercel project
    const vercelJson = await fsPromises.readFile('vercel.json', 'utf8');
    console.log(chalk.green('✅ Found Vercel project configuration'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Not in a Vercel project directory'));
    console.log(chalk.gray('   Please run this command from your project directory'));
    return;
  }

  try {
    // Check if Blob store already exists
    console.log(chalk.gray('📦 Checking for existing Vercel Blob store...'));
    execSync('vercel blob store get mcpresso-oauth', { stdio: 'pipe', encoding: 'utf8' });
    console.log(chalk.green('✅ Vercel Blob store already exists'));
    return;
  } catch (error) {
    // Blob store doesn't exist, proceed to create it
  }

  try {
    // Create Blob store using CLI in a temporary directory to avoid "deploy path" conflicts
    console.log(chalk.gray('📦 Creating Vercel Blob store...'));

    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'vercel-blob-'));
    const cliCmd = ['vercel', 'blob', 'store', 'add', 'mcpresso-oauth'];

    // If the user has a Vercel token in env, pass it to avoid interactive auth
    if (process.env.VERCEL_TOKEN) {
      cliCmd.push('--token', process.env.VERCEL_TOKEN);
    }

    execSync(cliCmd.join(' '), { stdio: 'inherit', cwd: tmpDir });

    console.log(chalk.green('✅ Vercel Blob store created successfully'));
    console.log(chalk.gray('💡 Blob store will be automatically linked to your deployment'));
    
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not create Vercel Blob store automatically'));
    console.log(chalk.gray('   You can create it manually with: vercel blob store add mcpresso-oauth'));
    console.log(chalk.gray('   Error:'), error);
  }
}

 