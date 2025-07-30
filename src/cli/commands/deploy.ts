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
  .option('--postgres-url <url>', 'PostgreSQL connection string')
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
      await deployToPlatform(platform, options.postgresUrl);

      console.log(chalk.green.bold('\n✅ Deployment successful!'));
      console.log(chalk.gray('Your MCP server is now live! 🎉'));

      if (platform.name === 'Vercel Functions') {
        console.log('\n' + chalk.yellow('────────  Final Production Steps  ────────'));
        console.log(chalk.white('1. Make the deployment public (Dashboard > Settings > Deployment Protection > Disabled).'));
        console.log(chalk.white('2. Set the DATABASE_URL environment variable in your Vercel dashboard:'));
        console.log('   ' + chalk.cyan('Settings > Environment Variables > DATABASE_URL') + '\n');
      }

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

async function deployToPlatform(platform: any, postgresUrl?: string) {
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

  // Special handling for Vercel - set up PostgreSQL connection
  if (platform.name === 'Vercel Functions') {
    await setupVercelPostgres(postgresUrl);
  }

  // Execute deployment
  console.log(chalk.gray(`🚀 Running: ${platform.command}`));
  execSync(platform.command, { stdio: 'inherit' });
}

async function setupVercelPostgres(postgresUrl?: string) {
  console.log(chalk.blue('🔧 Setting up PostgreSQL for OAuth storage...'));
  
  try {
    // Check if we're in a Vercel project
    const vercelJson = await fsPromises.readFile('vercel.json', 'utf8');
    console.log(chalk.green('✅ Found Vercel project configuration'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Not in a Vercel project directory'));
    console.log(chalk.gray('   Please run this command from your project directory'));
    return;
  }

  // Get PostgreSQL connection string
  let databaseUrl = postgresUrl;
  if (!databaseUrl) {
    const { dbUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'dbUrl',
        message: 'Enter your PostgreSQL connection string:',
        default: 'postgresql://username:password@localhost:5432/mcpresso_oauth',
        validate: (input: string) => {
          if (!input.startsWith('postgresql://') && !input.startsWith('postgres://')) {
            return 'Please enter a valid PostgreSQL connection string starting with postgresql:// or postgres://';
          }
          return true;
        }
      }
    ]);
    databaseUrl = dbUrl;
  }

  // Set environment variable for deployment
  console.log(chalk.gray('📝 Setting DATABASE_URL environment variable...'));
  try {
    execSync(`vercel env add DATABASE_URL production`, { 
      stdio: 'pipe',
      input: databaseUrl + '\n'
    });
    console.log(chalk.green('✅ DATABASE_URL environment variable set'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not set environment variable automatically'));
    console.log(chalk.gray('   Please set DATABASE_URL in your Vercel dashboard:'));
    console.log(chalk.cyan('   Settings > Environment Variables > DATABASE_URL'));
    console.log(chalk.gray('   Value: ' + databaseUrl));
  }

  console.log(chalk.green('✅ PostgreSQL setup complete'));
  console.log(chalk.gray('   The OAuth server will use PostgreSQL for persistent storage'));
}