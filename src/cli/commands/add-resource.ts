import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';

export const addResource = new Command('add-resource')
  .description('Add a new resource to your MCP server')
  .option('-n, --name <name>', 'Resource name')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('➕ Adding new resource...\n'));

      const resourceConfig = await getResourceConfig(options);
      await createResourceFile(resourceConfig);
      await updateServerFile(resourceConfig);

      console.log(chalk.green.bold('\n✅ Resource added successfully!'));
      console.log(chalk.gray(`📁 Created: src/resources/${resourceConfig.name}.ts`));
      console.log(chalk.gray('🔄 Restart your dev server to see changes'));

    } catch (error) {
      console.error(chalk.red('❌ Failed to add resource:'), error);
      process.exit(1);
    }
  });

async function getResourceConfig(options: any) {
  if (options.yes) {
    return {
      name: options.name || 'example',
      description: 'Example resource',
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string', required: false }
      ],
      methods: ['get', 'list', 'create', 'update', 'delete']
    };
  }

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Resource name (singular, lowercase):',
      default: options.name || 'example',
      validate: (input: string) => {
        if (!input.trim()) return 'Resource name is required';
        if (!/^[a-z][a-z0-9-]*$/.test(input)) {
          return 'Resource name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens';
        }
        return true;
      }
    }
  ]);

  const { description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Resource description:',
      default: `${name} resource`
    }
  ]);

  const { fields } = await getFields();
  const { methods } = await getMethods();

  return { name, description, fields, methods };
}

async function getFields() {
  const fields: any[] = [];
  
  console.log(chalk.blue('\n📝 Define resource fields:'));
  
  while (true) {
    const field = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Field name:',
        validate: (input: string) => {
          if (!input.trim()) return 'Field name is required';
          if (fields.some(f => f.name === input)) return 'Field name already exists';
          return true;
        }
      },
      {
        type: 'list',
        name: 'type',
        message: 'Field type:',
        choices: [
          { name: 'String', value: 'string' },
          { name: 'Number', value: 'number' },
          { name: 'Boolean', value: 'boolean' },
          { name: 'Date', value: 'date' },
          { name: 'Email', value: 'email' },
          { name: 'URL', value: 'url' }
        ]
      },
      {
        type: 'confirm',
        name: 'required',
        message: 'Is this field required?',
        default: true
      }
    ]);

    fields.push(field);

    const { addMore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Add another field?',
        default: true
      }
    ]);

    if (!addMore) break;
  }

  return { fields };
}

async function getMethods() {
  const { methods } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'methods',
      message: 'Select methods to implement:',
      choices: [
        { name: 'GET (get by ID)', value: 'get', checked: true },
        { name: 'LIST (get all)', value: 'list', checked: true },
        { name: 'CREATE (create new)', value: 'create', checked: true },
        { name: 'UPDATE (update existing)', value: 'update', checked: true },
        { name: 'DELETE (delete)', value: 'delete', checked: true },
        { name: 'SEARCH (custom search)', value: 'search', checked: false }
      ]
    }
  ]);

  return { methods };
}

async function createResourceFile(config: any) {
  const resourcePath = path.join('src', 'resources', `${config.name}.ts`);
  
  const content = generateResourceContent(config);
  await fs.writeFile(resourcePath, content);
}

function generateResourceContent(config: any) {
  const schemaFields = config.fields.map((field: any) => {
    let zodField = `  ${field.name}: z.${field.type}()`;
    
    if (field.type === 'email') {
      zodField = `  ${field.name}: z.string().email()`;
    } else if (field.type === 'url') {
      zodField = `  ${field.name}: z.string().url()`;
    }
    
    if (!field.required) {
      zodField += '.optional()';
    }
    
    return zodField;
  }).join(',\n');

  const methods = config.methods.map((method: string) => {
    switch (method) {
      case 'get':
        return `    get: {
      handler: async ({ id }) => {
        // TODO: Implement get logic
        return null;
      },
    },`;
      case 'list':
        return `    list: {
      handler: async () => {
        // TODO: Implement list logic
        return [];
      },
    },`;
      case 'create':
        return `    create: {
      handler: async (data) => {
        // TODO: Implement create logic
        return {
          id: Math.random().toString(36).substr(2, 9),
          ...data,
        };
      },
    },`;
      case 'update':
        return `    update: {
      handler: async ({ id, ...data }) => {
        // TODO: Implement update logic
        return { id, ...data };
      },
    },`;
      case 'delete':
        return `    delete: {
      handler: async ({ id }) => {
        // TODO: Implement delete logic
        return { success: true };
      },
    },`;
      case 'search':
        return `    search: {
      description: "Search ${config.name}s",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
      }),
      handler: async ({ query }) => {
        // TODO: Implement search logic
        return [];
      },
    },`;
      default:
        return '';
    }
  }).join('\n');

  return `import { z } from "zod";
import { createResource } from "mcpresso";

// ${config.description}
const ${config.name.charAt(0).toUpperCase() + config.name.slice(1)}Schema = z.object({
${schemaFields}
});

// TODO: Replace with your database/storage
const ${config.name}s: z.infer<typeof ${config.name.charAt(0).toUpperCase() + config.name.slice(1)}Schema>[] = [];

// Create the ${config.name} resource
export const ${config.name}Resource = createResource({
  name: "${config.name}",
  schema: ${config.name.charAt(0).toUpperCase() + config.name.slice(1)}Schema,
  uri_template: "${config.name}s/{id}",
  methods: {
${methods}
  },
});
`;
}

async function updateServerFile(config: any) {
  const serverPath = path.join('src', 'server.ts');
  
  try {
    let content = await fs.readFile(serverPath, 'utf8');
    
    // Add import
    const importStatement = `import { ${config.name}Resource } from "./resources/${config.name}.js";`;
    const importIndex = content.indexOf('// Import your resources');
    if (importIndex !== -1) {
      content = content.slice(0, importIndex + '// Import your resources'.length) + 
                '\n' + importStatement + 
                content.slice(importIndex + '// Import your resources'.length);
    }
    
    // Add to resources array
    const resourcesIndex = content.indexOf('resources: [');
    if (resourcesIndex !== -1) {
      const endIndex = content.indexOf(']', resourcesIndex);
      if (endIndex !== -1) {
        const before = content.slice(0, endIndex);
        const after = content.slice(endIndex);
        content = before + `, ${config.name}Resource` + after;
      }
    }
    
    await fs.writeFile(serverPath, content);
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not automatically update server.ts'));
    console.log(chalk.gray('Please manually add the resource to your server configuration'));
  }
} 