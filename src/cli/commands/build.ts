import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';

export const build = new Command('build')
  .description('Build the project for production')
  .option('--clean', 'Clean build directory before building')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🔨 Building mcpresso project...\n'));

      if (options.clean) {
        console.log(chalk.gray('🧹 Cleaning build directory...'));
        execSync('rm -rf dist', { stdio: 'inherit' });
      }

      console.log(chalk.gray('📦 Building with Bun...'));
      execSync('bun build src/server.ts --outdir dist --target node', { stdio: 'inherit' });

      console.log(chalk.gray('✅ Type checking...'));
      execSync('tsc --noEmit', { stdio: 'inherit' });

      console.log(chalk.green.bold('\n✅ Build completed successfully!'));
      console.log(chalk.gray('📁 Output: dist/'));
      console.log(chalk.gray('🚀 Ready for deployment!'));

    } catch (error) {
      console.error(chalk.red('❌ Build failed:'), error);
      process.exit(1);
    }
  }); 