# mcpresso Templates

This directory contains all the deployment templates for mcpresso. Each template is a self-contained module that defines how to generate a complete project for a specific deployment platform.

## Template Structure

Each template follows this structure:

```
templates/
├── types.ts              # Template interface definitions
├── index.ts              # Template registry
├── vercel/
│   └── index.ts          # Vercel template implementation
├── cloudflare/
│   └── index.ts          # Cloudflare template implementation
├── aws-lambda/
│   └── index.ts          # AWS Lambda template implementation
├── docker/
│   └── index.ts          # Docker template implementation
└── express/
    └── index.ts          # Express template implementation
```

## Template Interface

Each template must implement the `Template` interface:

```typescript
interface Template {
  id: string;                                    // Unique template ID
  name: string;                                  // Display name
  description: string;                           // Template description
  category: 'cloud' | 'self-hosted';            // Template category
  features: string[];                           // List of features
  complexity: 'easy' | 'medium' | 'hard';       // Complexity level
  
  getDependencies(): Record<string, string>;    // Runtime dependencies
  getDevDependencies(): Record<string, string>; // Development dependencies
  getScripts(): Record<string, string>;         // Package.json scripts
  
  generateFiles(config: ProjectConfig): Promise<Record<string, string>>;
}
```

## Adding a New Template

To add a new template:

1. **Create the template directory:**
   ```bash
   mkdir packages/mcpresso/src/cli/templates/your-template
   ```

2. **Create the template implementation:**
   ```typescript
   // packages/mcpresso/src/cli/templates/your-template/index.ts
   import { Template } from '../types.js';
   import { ProjectConfig } from '../../utils/project-creator.js';

   export const yourTemplate: Template = {
     id: 'your-template',
     name: 'Your Template',
     description: 'Description of your template',
     category: 'cloud', // or 'self-hosted'
     features: ['Feature 1', 'Feature 2'],
     complexity: 'easy', // or 'medium', 'hard'

     getDependencies: () => ({
       'mcpresso': '^0.5.0',
       'zod': '^3.23.8',
       'hono': '^4.8.2',
       // Add your specific dependencies
     }),

     getDevDependencies: () => ({
       '@types/node': '^20.0.0',
       'typescript': '^5.0.0',
       'bun-types': 'latest',
       // Add your specific dev dependencies
     }),

     getScripts: () => ({
       'dev': 'bun run --watch src/server.ts',
       'build': 'bun build src/server.ts --outdir dist --target node',
       'start': 'node dist/server.js',
       'typecheck': 'tsc --noEmit',
       'clean': 'rm -rf dist',
       // Add your specific scripts
     }),

     generateFiles: async (config: ProjectConfig) => {
       const files: Record<string, string> = {};

       // Generate your template files
       files['src/server.ts'] = generateServerFile(config);
       files['src/resources/example.ts'] = generateResourceExample(config);
       files['.env.example'] = generateEnvFile(config);
       
       // Add platform-specific config files
       files['your-config.json'] = generateConfigFile(config);

       // Add OAuth config if enabled
       if (config.oauth) {
         files['src/auth/oauth.ts'] = generateOAuthConfig(config);
       }

       return files;
     }
   };

   // Helper functions for generating specific files
   function generateServerFile(config: ProjectConfig): string {
     // Your server file generation logic
   }

   function generateResourceExample(config: ProjectConfig): string {
     // Your resource example generation logic
   }

   function generateEnvFile(config: ProjectConfig): string {
     // Your environment file generation logic
   }

   function generateConfigFile(config: ProjectConfig): string {
     // Your config file generation logic
   }

   function generateOAuthConfig(config: ProjectConfig): string {
     // Your OAuth config generation logic
   }
   ```

3. **Register the template:**
   ```typescript
   // packages/mcpresso/src/cli/templates/index.ts
   import { yourTemplate } from './your-template/index.js';

   const templates: Template[] = [
     vercelTemplate,
     cloudflareTemplate,
     awsLambdaTemplate,
     dockerTemplate,
     expressTemplate,
     yourTemplate, // Add your template here
   ];
   ```

4. **Test your template:**
   ```bash
   cd packages/mcpresso
   bun run build
   npx mcpresso init -t your-template -n test-project
   ```

## Template Best Practices

1. **Consistent Structure:** All templates should generate the same basic file structure
2. **Environment Variables:** Include a `.env.example` file with appropriate variables
3. **OAuth Support:** Handle OAuth configuration when enabled
4. **Documentation:** Include clear comments and TODOs in generated files
5. **Error Handling:** Provide helpful error messages and fallbacks
6. **Type Safety:** Use TypeScript for all template implementations

## Available Templates

### Cloud Templates
- **Vercel Functions** (`vercel`) - Serverless functions with edge runtime
- **Cloudflare Workers** (`cloudflare`) - Global edge computing platform
- **AWS Lambda** (`aws-lambda`) - Serverless compute service

### Self-Hosted Templates
- **Docker Container** (`docker`) - Self-hosted containerized deployment
- **Express Server** (`express`) - Traditional Node.js server

## Template Features

Each template includes:
- ✅ Complete project structure
- ✅ TypeScript configuration
- ✅ Environment variables setup
- ✅ OAuth 2.1 support (optional)
- ✅ Example resource with CRUD operations
- ✅ Platform-specific configuration files
- ✅ Development and production scripts
- ✅ Comprehensive documentation 