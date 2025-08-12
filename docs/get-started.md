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

2. Docker + Single User (API Key)
   Docker-first MCP server for a single user authenticated via API key (no database required)
   Category: docker
   Auth: api key (single user)
   Complexity: easy

3. Express + OAuth2.1 + SQLite
   Simple MCP server with OAuth2.1 authentication using SQLite database
   Category: express
   Auth: oauth
   Complexity: easy

4. Express + No Authentication
   Simple MCP server without authentication for public APIs
   Category: express
   Auth: none
   Complexity: easy

5. Custom template URL...
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
│       ├── schemas/       # Resource schemas
│       │   └── Note.ts    # Note data model
│       └── handlers/      # Resource handlers
│           └── note.ts    # Note resource implementation
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
| **Docker + Single User (API Key)** | Simple deployments, single-user tools | Easy | API key (single user) | None (file storage) |
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
// src/resources/schemas/User.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;
```

```typescript
// src/resources/handlers/user.ts
import { createResource } from 'mcpresso';
import { UserSchema, type User } from '../schemas/User.js';

// In-memory storage for demo
const users: User[] = [];

export const userResource = createResource({
  name: 'user',
  schema: UserSchema,
  uri_template: 'users/{id}',
  methods: {
    list: {
      handler: async () => {
        return users;
      },
    },
    get: {
      handler: async ({ id }) => {
        return users.find(user => user.id === id);
      },
    },
    create: {
      handler: async (data) => {
        const newUser = {
          id: Math.random().toString(36).substr(2, 9),
          name: data.name,
          email: data.email,
        };
        users.push(newUser);
        return newUser;
      },
    },
  },
});
```

Then add it to your server:

```typescript
// src/server.ts
import { noteResource } from './resources/handlers/note.js';
import { userResource } from './resources/handlers/user.js';

const server = createMCPServer({
  name: 'my-api',
  serverUrl: BASE_URL,
  resources: [noteResource, userResource] // Add your resource
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

1. **Explore the code**: Look at `src/server.ts` and `src/resources/handlers/note.ts`
2. **Add your own resources**: Create new schemas and handlers in `src/resources/`
3. **Customize authentication**: Modify OAuth settings in OAuth templates
4. **Deploy to production**: Choose your preferred platform
5. **Join the community**: Share your templates and get help

Happy coding! 🚀 