import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

export interface InitOptions {
  name: string;
  output: string;
  verbose?: boolean;
}

export async function initializeProject(options: InitOptions): Promise<void> {
  const { name, output, verbose = false } = options;
  const projectDir = join(output, name);

  if (verbose) {
    console.log(chalk.blue(`📁 Creating project directory: ${projectDir}`));
  }

  // Create project directory
  await mkdir(projectDir, { recursive: true });

  // Create package.json
  const packageJson = {
    name,
    version: '1.0.0',
    description: 'A MCPresso server',
    type: 'module',
    main: 'dist/server.js',
    scripts: {
      build: 'tsc',
      start: 'node dist/server.js',
      dev: 'tsc --watch & node --watch dist/server.js',
      clean: 'rm -rf dist'
    },
    dependencies: {
      mcpresso: '^0.2.3',
      zod: '^3.23.8'
    },
    devDependencies: {
      typescript: '^5.0.0',
      '@types/node': '^20.0.0'
    },
    engines: {
      node: '>=18.0.0'
    }
  };

  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'node',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  };

  // Create basic server code
  const serverCode = `import { z } from 'zod';
import { createResource, createMCPServer } from 'mcpresso';

// Define your resource schema
const ExampleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create a resource
const exampleResource = createResource({
  name: 'example',
  schema: ExampleSchema,
  uri_template: 'examples/{id}',
  methods: {
    create: {
      description: 'Create a new example',
      handler: async (args) => {
        console.log('Creating example:', args);
        return {
          id: 'example-1',
          title: args.title,
          description: args.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
    list: {
      description: 'List all examples',
      handler: async () => {
        console.log('Listing examples');
        return [
          {
            id: 'example-1',
            title: 'Example 1',
            description: 'This is an example',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      },
    },
    get: {
      description: 'Get an example by ID',
      handler: async (args) => {
        console.log('Getting example:', args.id);
        return {
          id: args.id,
          title: 'Example',
          description: 'This is an example',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
  },
});

// Create the MCP server
const server = createMCPServer({
  name: '${name}',
  resources: [exampleResource],
  exposeTypes: true,
  serverMetadata: {
    name: '${name}',
    version: '1.0.0',
    description: 'A MCPresso server',
    contact: {
      name: 'Your Name',
      email: 'your.email@example.com',
    },
  },
});

// Start the server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3080;
server.listen(port, () => {
  console.log(\`🚀 MCPresso server running on http://localhost:\${port}\`);
  console.log('📖 Server metadata available at: http://localhost:3080');
});
`;

  // Create README
  const readme = `# ${name}

A MCPresso server built with TypeScript.

## Features

- Type-safe with Zod schemas
- MCP-compliant resource definitions
- Server metadata exposure
- Ready to run

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the project:
   \`\`\`bash
   npm run build
   \`\`\`

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

4. The server will be available at \`http://localhost:3080\`

## Development

To run in development mode with auto-restart:
\`\`\`bash
npm run dev
\`\`\`

## Customization

1. Modify the resource schemas in \`src/server.ts\`
2. Add new resources and methods
3. Configure authentication, rate limiting, or retries
4. Add your business logic to the handlers

## MCP Integration

This server exposes:
- Resource types via \`exposeTypes: true\`
- Server metadata for discovery
- Standard MCP tools for each resource method

## Environment Variables

- \`PORT\`: Server port (default: 3080)
`;

  // Create .gitignore
  const gitignore = `# Dependencies
node_modules/

# Build output
dist/

# Environment variables
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;

  // Write all files
  const files = [
    { path: 'package.json', content: JSON.stringify(packageJson, null, 2) },
    { path: 'tsconfig.json', content: JSON.stringify(tsconfig, null, 2) },
    { path: 'src/server.ts', content: serverCode },
    { path: 'README.md', content: readme },
    { path: '.gitignore', content: gitignore },
  ];

  for (const file of files) {
    const filePath = join(projectDir, file.path);
    await mkdir(join(projectDir, file.path.split('/').slice(0, -1).join('/')), { recursive: true });
    await writeFile(filePath, file.content, 'utf-8');
    
    if (verbose) {
      console.log(chalk.gray(`  → Created: ${file.path}`));
    }
  }
} 