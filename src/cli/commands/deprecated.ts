// DEPRECATED: This file contains the old CLI commands that have been replaced by the new template-based system
// These commands are kept for reference but should not be used in new projects

import { Command } from 'commander';
import chalk from 'chalk';

// Old deploy command (deprecated)
export const deploy = new Command('deploy')
  .description('DEPRECATED: Use template-based deployment instead')
  .action(() => {
    console.log(chalk.yellow('⚠️  This command is deprecated.'));
    console.log(chalk.gray('Use the new template-based system instead:'));
    console.log(chalk.blue('  mcpresso init'));
    console.log(chalk.gray('For more information, visit: https://github.com/granular-software/mcpresso'));
  });

// Old add-resource command (deprecated)
export const addResource = new Command('add-resource')
  .description('DEPRECATED: Add resources manually to your project')
  .action(() => {
    console.log(chalk.yellow('⚠️  This command is deprecated.'));
    console.log(chalk.gray('Add resources manually to your project:'));
    console.log(chalk.blue('  src/resources/your-resource.ts'));
    console.log(chalk.gray('For more information, visit: https://github.com/granular-software/mcpresso'));
  });

// Old generate command (deprecated)
export const generate = new Command('generate')
  .description('DEPRECATED: Use template-based generation instead')
  .action(() => {
    console.log(chalk.yellow('⚠️  This command is deprecated.'));
    console.log(chalk.gray('Use the new template-based system instead:'));
    console.log(chalk.blue('  mcpresso init'));
    console.log(chalk.gray('For more information, visit: https://github.com/granular-software/mcpresso'));
  }); 