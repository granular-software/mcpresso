import { Command } from 'commander';
import chalk from 'chalk';
import { getTemplateInfo } from '../utils/template-manager.js';

export const info = new Command('info')
  .description('Show detailed information about a template')
  .argument('<template>', 'Template name or URL')
  .action(async (template) => {
    try {
      console.log(chalk.blue.bold('📖 Template Information'));
      console.log(chalk.gray('─'.repeat(60)));
      
      const info = await getTemplateInfo(template);
      
      if (!info) {
        console.log(chalk.red('❌ Template not found'));
        return;
      }
      
      console.log(chalk.cyan.bold(`\n${info.name}`));
      console.log(chalk.gray(info.description));
      
      console.log(chalk.blue.bold('\n📋 Details:'));
      console.log(`  Category: ${info.category}`);
      console.log(`  Authentication: ${info.authType}`);
      console.log(`  Complexity: ${info.complexity}`);
      console.log(`  Repository: ${info.url}`);
      
      if (info.features && info.features.length > 0) {
        console.log(chalk.blue.bold('\n✨ Features:'));
        info.features.forEach(feature => {
          console.log(`  • ${feature}`);
        });
      }
      
      if (info.requirements && info.requirements.length > 0) {
        console.log(chalk.blue.bold('\n🔧 Requirements:'));
        info.requirements.forEach(req => {
          console.log(`  • ${req}`);
        });
      }
      
      if (info.envVars && info.envVars.length > 0) {
        console.log(chalk.blue.bold('\n🔐 Environment Variables:'));
        info.envVars.forEach(env => {
          console.log(`  • ${env.name}: ${env.description}`);
        });
      }
      
      console.log(chalk.gray('\n💡 Use "mcpresso init" to create a new project from this template'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error fetching template info:'), error);
      process.exit(1);
    }
  }); 