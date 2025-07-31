#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init.js';
import { dev } from './commands/dev.js';
import { build } from './commands/build.js';
import { list } from './commands/list.js';
import { info } from './commands/info.js';

const program = new Command();

program
  .name('mcpresso')
  .description('CLI for creating and managing MCP servers from templates')
  .version('1.0.0');

// Add commands
program.addCommand(init);
program.addCommand(dev);
program.addCommand(build);
program.addCommand(list);
program.addCommand(info);

// Show help if no command provided
if (process.argv.length === 2) {
  console.log(chalk.blue.bold('🚀 mcpresso CLI v1.0.0'));
  console.log(chalk.gray('Create and manage MCP servers from templates\n'));
  program.help();
}

program.parse(); 