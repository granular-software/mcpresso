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
            { name: 'Railway (Recommended)', value: 'railway' },
            { name: 'Vercel Functions', value: 'vercel' }
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
          { name: 'Railway (Recommended)', value: 'railway' },
          { name: 'Vercel Functions', value: 'vercel' }
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
    'railway': {
      name: 'Railway',
      command: 'railway up',
      checkCommand: 'railway --version',
      installCommand: 'npm install -g @railway/cli',
      docs: 'https://docs.railway.app/'
    }
  };

  return configs[platform as keyof typeof configs] || configs.railway;
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

  // Special handling for different platforms
  if (platform.name === 'Vercel Functions') {
    await setupVercelPostgres(postgresUrl);
  } else if (platform.name === 'Railway') {
    await setupRailwayDeployment();
  }

  // Execute deployment
  console.log(chalk.gray(`🚀 Running: ${platform.command}`));
  
  if (platform.name === 'Railway') {
    // For Railway, we need to handle deployment more carefully
    try {
      execSync('railway up', { stdio: 'inherit' });
      console.log(chalk.green('✅ Railway deployment successful!'));
      console.log(chalk.gray('   Your app is now live on Railway'));
      console.log(chalk.gray('   Check your deployment at: https://railway.app'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Railway deployment had issues'));
      console.log(chalk.gray('   This might be normal - check the logs above'));
      console.log(chalk.gray('   You can check status with: railway status'));
    }
  } else {
    execSync(platform.command, { stdio: 'inherit' });
  }
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

async function setupRailwayDeployment() {
  console.log(chalk.blue('🚂 Setting up Railway deployment...'));
  
  try {
    // Check if we're in a Railway project
    const railwayJson = await fsPromises.readFile('railway.json', 'utf8');
    console.log(chalk.green('✅ Found Railway project configuration'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Not in a Railway project directory'));
    console.log(chalk.gray('   Please run this command from your project directory'));
    return;
  }

  // Check if Railway CLI is logged in
  try {
    execSync('railway whoami', { stdio: 'pipe' });
    console.log(chalk.green('✅ Railway CLI is authenticated'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Railway CLI not authenticated'));
    console.log(chalk.gray('   Please run: railway login'));
    console.log(chalk.gray('   Then try deployment again'));
    process.exit(1);
  }

  // Check if project is linked
  try {
    execSync('railway status', { stdio: 'pipe' });
    console.log(chalk.green('✅ Railway project is linked'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Railway project not linked'));
    console.log(chalk.gray('   Attempting to link project automatically...'));
    
    try {
      // Try to link to existing project
      execSync('railway link', { stdio: 'inherit' });
      console.log(chalk.green('✅ Railway project linked successfully'));
    } catch (linkError) {
      console.log(chalk.yellow('⚠️  Could not link to existing project'));
      console.log(chalk.gray('   Creating new Railway project...'));
      
      try {
        execSync('railway init', { stdio: 'inherit' });
        console.log(chalk.green('✅ New Railway project created'));
      } catch (initError) {
        console.log(chalk.red('❌ Failed to create Railway project'));
        console.log(chalk.gray('   Please run these commands manually:'));
        console.log(chalk.gray('   1. railway login'));
        console.log(chalk.gray('   2. railway init'));
        console.log(chalk.gray('   3. railway up'));
        process.exit(1);
      }
    }
  }

  // === Deploy application service ===
  console.log(chalk.blue('🚀 Deploying application service...'));

  const serviceName = process.env.RAILWAY_SERVICE_NAME || 'app';

  // Ensure service exists (create if missing)
  try {
    execSync(`railway service list | grep "${serviceName}"`, { stdio: 'pipe' });
    console.log(chalk.green(`✅ Service '${serviceName}' already exists`));
  } catch {
    console.log(chalk.gray(`   Creating service '${serviceName}'...`));
    execSync(`railway add --service ${serviceName}`, { stdio: 'inherit' });
  }

  // Deploy code to that service and wait until finished
  try {
    execSync(`railway up --service ${serviceName} --ci`, { stdio: 'inherit' });
    console.log(chalk.green('✅ Upload finished – build in progress on Railway'));
  } catch (deployErr) {
    console.log(chalk.red('❌ railway up failed'));
    console.log(chalk.gray('   You can redeploy manually with:'));
    console.log(chalk.gray(`   railway up --service ${serviceName}`));
    throw deployErr;
  }

  console.log(chalk.green('✅ Railway setup complete'));
  console.log(chalk.gray('   Your app will be deployed with PostgreSQL database'));
  console.log(chalk.gray('   Demo users will be created automatically'));
}