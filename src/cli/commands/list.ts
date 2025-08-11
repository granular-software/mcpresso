import { Command } from 'commander';
import chalk from 'chalk';
import { getAvailableTemplates } from '../utils/template-manager.js';

export const list = new Command('list')
  .description('List available templates')
  .option('-c, --category <category>', 'Filter by category (docker, express, cloud)')
  .option('-a, --auth <auth>', 'Filter by authentication type (oauth, token, none)')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('📋 Available Templates'));
      console.log(chalk.gray('─'.repeat(60)));
      
      const templates = await getAvailableTemplates();
      
      // Filter templates based on options
      let filteredTemplates = templates;
      
      if (options.category) {
        filteredTemplates = filteredTemplates.filter(t => 
          t.category.toLowerCase().includes(options.category.toLowerCase())
        );
      }
      
      if (options.auth) {
        filteredTemplates = filteredTemplates.filter(t => 
          t.authType.toLowerCase().includes(options.auth.toLowerCase())
        );
      }
      
      if (filteredTemplates.length === 0) {
        console.log(chalk.yellow('No templates found matching your criteria.'));
        return;
      }
      
      filteredTemplates.forEach((template, index) => {
        console.log(chalk.cyan.bold(`\n${index + 1}. ${template.name}`));
        console.log(chalk.gray(`   ${template.description}`));
        console.log(chalk.gray(`   Category: ${template.category}`));
        console.log(chalk.gray(`   Auth: ${template.authType}`));
        console.log(chalk.gray(`   Complexity: ${template.complexity}`));
        console.log(chalk.gray(`   URL: ${template.url}`));
      });
      
      console.log(chalk.gray('\n💡 Use "mcpresso init" to create a new project from a template'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error fetching templates:'), error);
      process.exit(1);
    }
  }); 