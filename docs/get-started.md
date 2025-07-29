# Get Started with MCPresso

This guide will walk you through creating your first MCPresso server using our CLI. You'll learn how to set up a project, add resources, and deploy to production.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** or **Bun** installed
- A **package manager** (npm, yarn, or pnpm)
- **Git** (optional, for version control)

## Step 1: Create Your First Project

The fastest way to get started is using our CLI:

```bash
# Create a new MCPresso project
npx mcpresso init
```

This will start an interactive setup process. You'll be asked several questions:

### Project Configuration

1. **Choose a deployment template:**
   - **Vercel Functions** - Best for beginners, quick prototypes
   - **Cloudflare Workers** - High performance, global edge
   - **AWS Lambda** - Enterprise applications, AWS ecosystem
   - **Docker Container** - Self-hosting, full control
   - **Express Server** - Simple setup, easy debugging

2. **Project details:**
   - **Project name** - Choose a descriptive name (e.g., `my-notes-api`)
   - **Description** - Describe what your server does
   - **Author name** - Your name or organization
   - **Email** - Your contact email

3. **Authentication:**
   - **Enable OAuth 2.1** - Choose whether to add authentication

4. **Setup options:**
   - **Initialize git repository** - Recommended for version control
   - **Install dependencies** - Recommended to get started quickly

### Example Session

```bash
$ npx mcpresso init

🚀 Welcome to mcpresso!
Let's create your MCP server together.

? Choose a deployment template: (Use arrow keys)
❯ Vercel Functions - Serverless functions with edge runtime
  Cloudflare Workers - Global edge computing platform
  AWS Lambda - Serverless compute service
  Docker Container - Self-hosted containerized deployment
  Express Server - Traditional Node.js server

? What's your project name? my-notes-api
? Describe your project: A simple notes API with MCPresso
? Your name: John Doe
? Your email: john@example.com
? Enable OAuth 2.1 authentication? No
? Initialize git repository? Yes
? Install dependencies now? Yes

📁 Creating project: my-notes-api
Template: Vercel Functions
  Generating files...
  Initializing git repository...
  Installing dependencies...

✅ Project created successfully!
```

## Step 2: Explore Your Project

After creation, your project will have this structure:

```
my-notes-api/
├── src/
│   ├── server.ts              # Main server file
│   ├── resources/
│   │   └── example.ts         # Example resource
│   └── auth/                  # OAuth config (if enabled)
│       └── oauth.ts
├── api/                       # Vercel Functions handler
│   └── index.ts
├── package.json               # Dependencies and scripts
├── vercel.json               # Vercel configuration
├── .env.example              # Environment variables
├── tsconfig.json             # TypeScript configuration
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
```

## Step 3: Start Development

Navigate to your project and start the development server:

```bash
cd my-notes-api
npm run dev
```

This will start a local development server with hot reload. You should see:

```
🚀 my-notes-api running on http://localhost:3000
```

## Step 4: Test Your Server

Your server is now running! You can test it with:

```bash
# Test the health endpoint
curl http://localhost:3000/

# Test the example resource
curl http://localhost:3000/notes
```

## Step 5: Add Your First Resource

Let's add a custom resource to your server. Use the CLI:

```bash
npx mcpresso add-resource
```

This will guide you through creating a new resource:

```bash
? Resource name: user
? Resource description: User management
? Add fields to your resource? Yes
? Field name: name
? Field type: string
? Is this field required? Yes
? Add another field? Yes
? Field name: email
? Field type: string
? Is this field required? Yes
? Add another field? No
? Which methods should this resource have? (Press <space> to select, <a> to toggle all, <i> to invert selection)
❯ ◉ get    - Get a single user
  ◉ list   - List all users
  ◉ create - Create a new user
  ◉ update - Update a user
  ◉ delete - Delete a user
  ◉ search - Search users
```

The CLI will automatically:
- Generate the resource file
- Update your server configuration
- Add the new resource to your MCP server

## Step 6: Customize Your Resource

Open the generated resource file and customize it:

```typescript
// src/resources/user.ts
import { z } from "zod";
import { createResource } from "mcpresso";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Replace with your actual data source
const users: z.infer<typeof UserSchema>[] = [];

export const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  methods: {
    get: {
      handler: async ({ id }) => {
        return users.find((user) => user.id === id);
      },
    },
    list: {
      handler: async () => {
        return users;
      },
    },
    create: {
      handler: async (data) => {
        const newUser = {
          id: Math.random().toString(36).substr(2, 9),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(newUser);
        return newUser;
      },
    },
    // ... other methods
  },
});
```

## Step 7: Deploy to Production

When you're ready to deploy:

```bash
# Deploy using the CLI
npx mcpresso deploy

# Or use the npm script
npm run deploy
```

The CLI will automatically detect your platform and deploy accordingly:

- **Vercel**: Uses `vercel --prod`
- **Cloudflare**: Uses `wrangler deploy`
- **AWS Lambda**: Uses `serverless deploy`
- **Docker**: Uses `docker-compose up -d`

## Step 8: Test Your Deployed Server

After deployment, you'll get a URL like:
- Vercel: `https://my-notes-api.vercel.app`
- Cloudflare: `https://my-notes-api.your-subdomain.workers.dev`
- AWS: `https://your-api-gateway-url.amazonaws.com`

Test your deployed server:

```bash
# Test the health endpoint
curl https://your-deployed-url.com/

# Test your resources
curl https://your-deployed-url.com/users
```

## Next Steps

### Add Authentication

If you didn't enable OAuth during setup, you can add it later:

1. Install the OAuth package:
   ```bash
   npm install mcpresso-oauth-server
   ```

2. Create the OAuth configuration:
   ```bash
   npx mcpresso add-resource --oauth
   ```

3. Update your environment variables with OAuth settings

### Add Database Integration

Replace the in-memory storage with a real database:

```typescript
// Example with PostgreSQL
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  methods: {
    get: {
      handler: async ({ id }) => {
        const result = await pool.query(
          'SELECT * FROM users WHERE id = $1',
          [id]
        );
        return result.rows[0];
      },
    },
    // ... other methods
  },
});
```

### Add Custom Methods

Extend your resources with custom business logic:

```typescript
methods: {
  // ... standard methods
  
  search_by_email: {
    description: "Search users by email domain",
    inputSchema: z.object({
      domain: z.string().describe("Email domain to search"),
    }),
    handler: async ({ domain }) => {
      return users.filter(user => 
        user.email.endsWith(`@${domain}`)
      );
    },
  },
}
```

### Generate from OpenAPI

If you have an existing API specification:

```bash
# Generate a server from OpenAPI spec
npx mcpresso generate

# Follow the prompts to convert your API
```

## Troubleshooting

### Common Issues

**Server won't start:**
```bash
# Check if dependencies are installed
npm install

# Check TypeScript errors
npm run typecheck
```

**Deployment fails:**
- Verify platform credentials are configured
- Check network connectivity
- Review platform-specific logs

**Resource not found:**
- Make sure the resource is imported in `src/server.ts`
- Check the resource file for syntax errors
- Verify the URI template matches your requests

### Getting Help

- Check the [main documentation](../README.md)
- Review platform-specific documentation
- Open an issue on GitHub

## Congratulations! 🎉

You've successfully created and deployed your first MCPresso server! 

Your server is now ready to:
- ✅ Handle MCP protocol requests
- ✅ Expose your resources to AI agents
- ✅ Scale automatically with your chosen platform
- ✅ Integrate with authentication (if enabled)

Happy coding! 🚀 