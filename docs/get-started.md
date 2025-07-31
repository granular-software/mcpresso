# Getting Started with mcpresso

This guide will walk you through creating your first MCP server using mcpresso.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **npm, yarn, or pnpm** - Your preferred package manager

## Quick Start

### 1. Install the CLI

```bash
npm install -g mcpresso
```

Or use npx (no installation required):

```bash
npx mcpresso init
```

### 2. Create Your First Project

```bash
# Interactive setup
mcpresso init

# Or use a specific template
mcpresso init my-api --template template-express-no-auth --yes
```

### 3. Start Development

```bash
cd my-api
npm run dev
```

Your server will be running at `http://localhost:3000`!

## Step-by-Step Guide

### Step 1: Choose a Template

When you run `mcpresso init`, you'll see a list of available templates:

```
📋 Available Templates
────────────────────────────────────────────────────────────

1. Docker + OAuth2.1 + PostgreSQL
   Production-ready MCP server with OAuth2.1 authentication and PostgreSQL database
   Category: docker
   Auth: oauth
   Complexity: medium

2. Express + OAuth2.1 + SQLite
   Simple MCP server with OAuth2.1 authentication using SQLite database
   Category: express
   Auth: oauth
   Complexity: easy

3. Express + No Authentication
   Simple MCP server without authentication for public APIs
   Category: express
   Auth: none
   Complexity: easy

4. Custom template URL...
```

**For beginners**, we recommend starting with **"Express + No Authentication"** - it's the simplest template and perfect for learning.

### Step 2: Configure Your Project

After selecting a template, you'll be prompted for:

- **Project name**: Choose a descriptive name (e.g., `my-notes-api`)
- **Description**: What your API does (e.g., `A simple notes management API`)
- **Install dependencies**: Usually `yes` (recommended)
- **Initialize git**: Usually `yes` (recommended)

### Step 3: Explore Your Project

Your new project will have this structure:

```
my-api/
├── src/
│   ├── server.ts          # Main server file
│   └── resources/
│       └── example.ts     # Example MCP resource
├── package.json           # Dependencies and scripts
├── README.md             # Documentation
├── .env.example          # Environment variables
├── tsconfig.json         # TypeScript config
└── template.json         # Template metadata
```

### Step 4: Start Development

```bash
# Install dependencies (if not done automatically)
npm install

# Start development server
npm run dev
```

Your server will be running at `http://localhost:3000` with:
- **MCP server**: Available for AI agents
- **Health check**: `http://localhost:3000/health`
- **Hot reload**: Changes are reflected immediately

### Step 5: Test Your API

You can test your MCP server using any MCP client. The example template includes a notes resource with:

- **List notes**: `GET /mcp/resources/notes`
- **Get note**: `GET /mcp/resources/notes/{id}`
- **Create note**: `POST /mcp/resources/notes`
- **Update note**: `PUT /mcp/resources/notes/{id}`
- **Delete note**: `DELETE /mcp/resources/notes/{id}`

### Step 6: Build for Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

## Template Comparison

| Template | Best For | Complexity | Auth | Database |
|----------|----------|------------|------|----------|
| **Express + No Auth** | Learning, public APIs | Easy | None | In-memory |
| **Express + OAuth + SQLite** | Small apps, development | Easy | OAuth | SQLite file |
| **Docker + OAuth + PostgreSQL** | Production, scaling | Medium | OAuth | PostgreSQL |

## Environment Variables

Each template includes a `.env.example` file. Copy it to `.env` and configure:

```bash
cp .env.example .env
```

Common variables:
- `PORT`: Server port (default: 3000)
- `SERVER_URL`: Your server's public URL
- `JWT_SECRET`: Secret for OAuth tokens (OAuth templates)
- `DATABASE_URL`: Database connection (Docker template)

## Adding Custom Resources

Create new MCP resources in `src/resources/`:

```typescript
// src/resources/users.ts
import { Resource } from 'mcpresso';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export const usersResource: Resource = {
  name: 'users',
  description: 'User management',
  schema: UserSchema,
  
  list: async () => {
    // Return all users
  },
  
  get: async (id: string) => {
    // Return specific user
  },
  
  create: async (data: { name: string; email: string }) => {
    // Create new user
  },
};
```

Then add it to your server:

```typescript
// src/server.ts
import { usersResource } from './resources/users.js';

const server = createServer({
  name: 'my-api',
  version: '1.0.0',
  resources: [notesResource, usersResource] // Add your resource
});
```

## Deployment

### Railway (Recommended)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy**:
   ```bash
   railway login
   railway init
   railway up
   ```

### Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

### Docker

For the Docker template:

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## Troubleshooting

### Common Issues

**"Port already in use"**
```bash
# Use a different port
npm run dev -- --port 3001
```

**"Template not found"**
```bash
# List available templates
mcpresso list

# Use the correct template ID
mcpresso init my-project --template template-express-no-auth
```

**"Build failed"**
```bash
# Clean and rebuild
npm run clean
npm run build
```

### Getting Help

- **Documentation**: [mcpresso.dev](https://mcpresso.dev)
- **GitHub**: [github.com/granular-software/mcpresso](https://github.com/granular-software/mcpresso)
- **Issues**: [GitHub Issues](https://github.com/granular-software/mcpresso/issues)

## Next Steps

1. **Explore the code**: Look at `src/server.ts` and `src/resources/example.ts`
2. **Add your own resources**: Create new files in `src/resources/`
3. **Customize authentication**: Modify OAuth settings in OAuth templates
4. **Deploy to production**: Choose your preferred platform
5. **Join the community**: Share your templates and get help

Happy coding! 🚀 