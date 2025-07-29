import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';

export const generate = new Command('generate')
  .description('Generate MCP server from OpenAPI specification')
  .option('-s, --source <path>', 'OpenAPI spec file path')
  .option('-o, --output <path>', 'Output directory')
  .option('-n, --name <name>', 'Project name')
  .option('--oauth', 'Enable OAuth 2.1')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🔧 Generating MCP server from OpenAPI...\n'));

      console.log(chalk.yellow('⚠️  This feature requires mcpresso-openapi-generator'));
      console.log(chalk.gray('Install it with: npm install -g mcpresso-openapi-generator\n'));

      const config = await getGenerateConfig(options);
      
      // Check if generator is available
      try {
        const { execSync } = await import('child_process');
        execSync('mcpresso-generate --version', { stdio: 'pipe' });
      } catch (error) {
        console.log(chalk.red('❌ mcpresso-openapi-generator not found'));
        console.log(chalk.gray('Please install it first:'));
        console.log(chalk.gray('  npm install -g mcpresso-openapi-generator'));
        process.exit(1);
      }

      // Run the generator
      await runGenerator(config);

      console.log(chalk.green.bold('\n✅ MCP server generated successfully!'));
      console.log(chalk.gray(`📁 Output: ${config.output}`));
      console.log(chalk.gray('🚀 Ready to deploy!'));

    } catch (error) {
      console.error(chalk.red('❌ Generation failed:'), error);
      process.exit(1);
    }
  });

async function getGenerateConfig(options: any) {
  if (options.source && options.output && options.name) {
    return {
      source: options.source,
      output: options.output,
      name: options.name,
      oauth: options.oauth || false
    };
  }

  const questions = [
    {
      type: 'input',
      name: 'source',
      message: 'OpenAPI spec file path:',
      default: options.source || './api-spec.json',
      validate: (input: string) => {
        if (!input.trim()) return 'Source file is required';
        return true;
      }
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output directory:',
      default: options.output || './generated-server',
      validate: (input: string) => {
        if (!input.trim()) return 'Output directory is required';
        return true;
      }
    },
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: options.name || 'generated-mcp-server',
      validate: (input: string) => {
        if (!input.trim()) return 'Project name is required';
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Project name must be lowercase with only letters, numbers, and hyphens';
        }
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'oauth',
      message: 'Enable OAuth 2.1 authentication?',
      default: options.oauth || false
    }
  ];

  return await inquirer.prompt(questions);
}

async function runGenerator(config: any) {
  const { execSync } = await import('child_process');
  
  const command = [
    'mcpresso-generate',
    'generate',
    '--source', config.source,
    '--output', config.output,
    '--name', config.name,
    '--verbose'
  ];

  if (config.oauth) {
    command.push('--oauth');
  }

  console.log(chalk.gray(`🚀 Running: ${command.join(' ')}`));
  execSync(command.join(' '), { stdio: 'inherit' });
} 