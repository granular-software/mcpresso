#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init.js';
import { deploy } from './commands/deploy.js';
import { dev } from './commands/dev.js';
import { build } from './commands/build.js';
import { addResource } from './commands/add-resource.js';
import { generate } from './commands/generate.js';

const program = new Command();

program
  .name('mcpresso')
  .description('CLI for creating and managing MCP servers')
  .version('0.5.0');

// Add commands
program.addCommand(init);
program.addCommand(deploy);
program.addCommand(dev);
program.addCommand(build);
program.addCommand(addResource);
program.addCommand(generate);

// Show help if no command provided
if (process.argv.length === 2) {
  console.log(chalk.blue.bold('🚀 mcpresso CLI'));
  console.log(chalk.gray('Create and manage MCP servers with ease\n'));
  program.help();
}

program.parse(); 