# Creating Custom Templates

This guide explains how to create and share custom templates for the mcpresso CLI.

## Overview

Templates are GitHub repositories that contain complete, production-ready MCP server projects. They allow users to quickly create new projects with predefined configurations, dependencies, and structure.

## Template Structure

Every template must follow this structure:

```
your-template/
├── template.json          # Template metadata
├── package.json           # Dependencies and scripts
├── README.md             # Documentation
├── .env.example          # Environment variables
├── .gitignore            # Git ignore rules
├── tsconfig.json         # TypeScript config
└── src/
    ├── server.ts         # Main server file
    └── resources/        # MCP resources
        └── example.ts    # Example resource
```

## Required Files

### 1. `template.json`

Template metadata and configuration:

```json
{
  "name": "Your Template Name",
  "description": "Description of what this template does",
  "version": "1.0.0",
  "mcpressoVersion": "^0.7.0",
  "category": "express",
  "authType": "none",
  "complexity": "easy",
  "features": [
    "MCP server",
    "TypeScript",
    "Production ready"
  ],
  "requirements": [
    "Node.js 18+",
    "npm or yarn"
  ],
  "envVars": [
    {
      "name": "PORT",
      "description": "Server port",
      "required": false,
      "default": "3000"
    },
    {
      "name": "SERVER_URL",
      "description": "Base URL of your server",
      "required": true
    }
  ]
}
```

### 2. `package.json`

Project dependencies and scripts:

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "description": "{{PROJECT_DESCRIPTION}}",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "mcpresso": "^0.7.7",
    "zod": "^3.23.8",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.21",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  },
  "keywords": ["mcp", "mcpresso", "express", "api"],
  "author": "",
  "license": "MIT"
}
```

**Note**: Use `{{PROJECT_NAME}}` and `{{PROJECT_DESCRIPTION}}` placeholders - they'll be replaced when the template is used.

### 3. `src/server.ts`

Main server file:

```typescript
import { createServer } from 'mcpresso';
import { z } from 'zod';
import express from 'express';
import { notesResource } from './resources/example.js';

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create MCP server
const server = createServer({
  name: '{{PROJECT_NAME}}',
  version: '1.0.0',
  resources: [notesResource]
});

// Start server
server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});
```

### 4. `src/resources/example.ts`

Example MCP resource:

```typescript
import { Resource } from 'mcpresso';
import { z } from 'zod';

// In-memory storage for demo
const notes = new Map<string, { id: string; title: string; content: string; createdAt: string }>();

// Note schema
const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.string()
});

export const notesResource: Resource = {
  name: 'notes',
  description: 'Simple notes management',
  schema: NoteSchema,
  
  // List all notes
  list: async () => {
    return Array.from(notes.values());
  },
  
  // Get a specific note
  get: async (id: string) => {
    const note = notes.get(id);
    if (!note) {
      throw new Error(`Note with id ${id} not found`);
    }
    return note;
  },
  
  // Create a new note
  create: async (data: { title: string; content: string }) => {
    const id = Date.now().toString();
    const note = {
      id,
      title: data.title,
      content: data.content,
      createdAt: new Date().toISOString()
    };
    notes.set(id, note);
    return note;
  },
  
  // Update a note
  update: async (id: string, data: Partial<{ title: string; content: string }>) => {
    const note = notes.get(id);
    if (!note) {
      throw new Error(`Note with id ${id} not found`);
    }
    
    const updatedNote = { ...note, ...data };
    notes.set(id, updatedNote);
    return updatedNote;
  },
  
  // Delete a note
  delete: async (id: string) => {
    const note = notes.get(id);
    if (!note) {
      throw new Error(`Note with id ${id} not found`);
    }
    notes.delete(id);
    return { success: true };
  },
  
  // Search notes
  search: async (query: string) => {
    const results = Array.from(notes.values()).filter(note =>
      note.title.toLowerCase().includes(query.toLowerCase()) ||
      note.content.toLowerCase().includes(query.toLowerCase())
    );
    return results;
  }
};
```

### 5. `README.md`

Documentation for your template:

```markdown
# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Features

- MCP server with Express.js
- TypeScript support
- Development and production builds
- Environment variable configuration

## Project Structure

```
src/
├── server.ts          # Main server file
└── resources/         # MCP resources
    └── example.ts     # Example resource
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| PORT | Server port | No | 3000 |
| SERVER_URL | Base URL of your server | Yes | - |

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run typecheck` - Type check without building

## License

MIT
```

### 6. `.env.example`

Environment variables template:

```bash
# Server Configuration
PORT=3000
SERVER_URL=http://localhost:3000

# Add your custom environment variables below
```

### 7. `tsconfig.json`

TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

## Template Categories

Choose the appropriate category for your template:

- **express**: Express.js servers
- **docker**: Docker containerized applications
- **cloud**: Cloud platform specific (Vercel, Cloudflare, etc.)

## Auth Types

- **none**: No authentication required
- **oauth**: OAuth 2.1 authentication
- **token**: Bearer token authentication

## Complexity Levels

- **easy**: Simple setup, few dependencies
- **medium**: Moderate complexity, some configuration required
- **hard**: Complex setup, multiple services, advanced features

## Creating Your Template

### 1. Create the Repository

```bash
# Create a new GitHub repository
gh repo create my-template --public --description "My custom mcpresso template"

# Clone and set up
git clone https://github.com/username/my-template.git
cd my-template
```

### 2. Add Template Files

Create all the required files as shown above.

### 3. Test Your Template

```bash
# Test locally
mcpresso init test-project --template https://github.com/username/my-template.git

# Verify it works
cd test-project
npm run dev
```

### 4. Publish Your Template

```bash
# Commit and push
git add .
git commit -m "feat: initial template"
git push origin main
```

## Using Your Template

Once published, users can use your template:

```bash
# Direct GitHub URL
mcpresso init my-project --template https://github.com/username/my-template.git

# Or add it to the official templates list
```

## Best Practices

### 1. Keep It Simple
- Start with basic functionality
- Add complexity gradually
- Document everything clearly

### 2. Follow Conventions
- Use consistent file structure
- Follow naming conventions
- Include proper TypeScript types

### 3. Test Thoroughly
- Test the template creation process
- Verify all scripts work
- Test in different environments

### 4. Document Well
- Clear README with usage examples
- Document all environment variables
- Include troubleshooting section

### 5. Stay Updated
- Keep dependencies up to date
- Test with latest mcpresso versions
- Respond to issues and feedback

## Advanced Features

### Custom Placeholders

You can use additional placeholders in your files:

- `{{PROJECT_NAME}}` - Project name
- `{{PROJECT_DESCRIPTION}}` - Project description
- `{{AUTHOR}}` - Author name (if provided)
- `{{VERSION}}` - Project version (if provided)

### Custom Scripts

Add useful scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

### Environment-Specific Configs

Create different configurations for different environments:

```typescript
// src/config/index.ts
export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
  }
};
```

## Sharing Your Template

### 1. GitHub Repository
- Make it public
- Add good documentation
- Include examples

### 2. Community Contribution
- Submit a PR to add it to official templates
- Share in the community
- Get feedback and improve

### 3. Documentation
- Write a blog post
- Create tutorials
- Share on social media

## Troubleshooting

### Common Issues

**Template not found**
- Check the GitHub URL is correct
- Ensure the repository is public
- Verify the repository exists

**Build errors**
- Check TypeScript configuration
- Verify all dependencies are included
- Test the build process locally

**Runtime errors**
- Check environment variables
- Verify server configuration
- Test with different Node.js versions

### Getting Help

- **GitHub Issues**: [mcpresso repository](https://github.com/granular-software/mcpresso/issues)
- **Discussions**: [GitHub Discussions](https://github.com/granular-software/mcpresso/discussions)
- **Community**: Join our community channels

## Examples

Check out these example templates for inspiration:

- [template-express-no-auth](https://github.com/granular-software/template-express-no-auth)
- [template-express-oauth-sqlite](https://github.com/granular-software/template-express-oauth-sqlite)
- [template-docker-oauth-postgresql](https://github.com/granular-software/template-docker-oauth-postgresql)

Happy template creating! 🚀 