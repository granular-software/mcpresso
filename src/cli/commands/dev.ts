import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';

export const dev = new Command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🚀 Starting mcpresso development server...\n'));

      const port = options.port;
      const host = options.host;

      console.log(chalk.gray(`📍 Server will be available at http://${host}:${port}`));
      console.log(chalk.gray('🔄 Hot reload enabled - changes will restart automatically'));
      console.log(chalk.gray('⏹️  Press Ctrl+C to stop the server\n'));

      // Start the development server
      execSync(`bun run --watch src/server.ts`, { 
        stdio: 'inherit',
        env: {
          ...process.env,
          PORT: port,
          NODE_ENV: 'development'
        }
      });

    } catch (error) {
      console.error(chalk.red('❌ Failed to start development server:'), error);
      process.exit(1);
    }
  }); 