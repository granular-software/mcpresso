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
  .option('--blob-store-id <id>', 'Existing Vercel Blob store ID to use')
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
      await deployToPlatform(platform, options.blobStoreId);

      console.log(chalk.green.bold('\n✅ Deployment successful!'));
      console.log(chalk.gray('Your MCP server is now live! 🎉'));

      if (platform.name === 'Vercel Functions') {
        console.log('\n' + chalk.yellow('────────  Final Production Steps  ────────'));
        console.log(chalk.white('1. Make the deployment public (Dashboard > Settings > Deployment Protection > Disabled).'));
        console.log(chalk.white('2. Link the Blob store to this project if not already linked:'));
        console.log('   ' + chalk.cyan('vercel blob store link <store_id>') + '\n');
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

async function deployToPlatform(platform: any, blobStoreId?: string) {
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
    await setupVercelStorage(blobStoreId);
  }

  // Execute deployment
  console.log(chalk.gray(`🚀 Running: ${platform.command}`));
  execSync(platform.command, { stdio: 'inherit' });
}

async function setupVercelStorage(blobStoreId?: string) {
  console.log(chalk.blue('🔧 Checking Vercel Blob storage...'));
  
  try {
    // Check if we're in a Vercel project
    const vercelJson = await fsPromises.readFile('vercel.json', 'utf8');
    console.log(chalk.green('✅ Found Vercel project configuration'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Not in a Vercel project directory'));
    console.log(chalk.gray('   Please run this command from your project directory'));
    return;
  }

  // Determine desired store id
  let storeId = blobStoreId || 'mcpresso-oauth';
  if (!blobStoreId) {
    try {
      const pkg = JSON.parse(await fsPromises.readFile('package.json', 'utf8'));
      if (pkg.name) {
        const safe = pkg.name.toString().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        storeId = `mcpresso-${safe}-oauth`;
      }
    } catch (_) {}
  }

  // helper to GET store; returns true if linked
  const tryGet = (): boolean => {
    try {
      execSync(`vercel blob store get ${storeId}`, { stdio: 'pipe', encoding: 'utf8' });
      return true;
    } catch {
      return false;
    }
  };

  if (tryGet()) {
    console.log(chalk.green(`✅ Using Blob store: ${storeId}`));
    return storeId;
  }

  const isId = storeId.startsWith('store_');

  // If user supplied an id but it's not linked → link it
  if (isId) {
    console.log(chalk.yellow('⚠️  The Vercel CLI version in use does not support automatic linking. Make sure the store is linked to this project via the Vercel dashboard.')); 
    return storeId;
  } else {
    // Name path: create then link
    try {
      console.log(chalk.gray('📦 Blob store not found – creating...'));
      const out = execSync(`vercel blob store add ${storeId} --region iad1 --yes`, { encoding: 'utf8', stdio: 'pipe' });
      const match = out.match(/\((store_[A-Za-z0-9]+)/);
      const newId = match ? match[1] : storeId;
      console.log(chalk.green(`✅ Created Blob store (${newId})`));
      console.log(chalk.yellow('⚠️  Automatic linking is not supported by this CLI version. Please link the store to the project in the Vercel dashboard.'));
      return newId;
    } catch {}
  }

  // Fallback manual instructions
  console.log('\n' + chalk.yellow('────────────────────────────────────────────'));
  console.log(chalk.blueBright('ℹ️  Automatic creation/linking failed or requires additional permissions.'));
  console.log(chalk.yellow('────────────────────────────────────────────\n'));

  console.log(`${chalk.white('1. Create a new Blob store OR link an existing one:')}`);
  console.log('   ' + chalk.cyan(`vercel blob store add ${storeId} --region iad1`) + chalk.gray('   # new')); 
  console.log('   ' + chalk.cyan(`vercel blob store link ${isId ? storeId : '<store_id>'}`) + chalk.gray('           # existing') + '\n');

  console.log(`${chalk.white('2. Deploy again using the store ID:')}`);
  console.log('   ' + chalk.cyan('npx mcpresso deploy --blob-store-id <store_id>')+ '\n');
  process.exit(1);
}

 