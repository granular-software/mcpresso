# Creating a Vercel-Hosted Token-Authenticated MCP Server

This guide walks you through creating a Vercel-hosted MCP server with Bearer Token authentication using `npx mcpresso`.

## Prerequisites

- Node.js 18+ installed
- Vercel CLI installed (`npm install -g vercel`)
- A Vercel account (free at [vercel.com](https://vercel.com))

## Step 1: Create the Project

```bash
# Create a new mcpresso project
npx mcpresso init
```

## Step 2: Follow the Interactive Prompts

When prompted, select the following options:

1. **Template**: Choose `Vercel Functions`
2. **Project name**: Enter your desired project name (e.g., `my-vercel-mcp-server`)
3. **Description**: Enter a description (e.g., `A token-authenticated MCP server`)
4. **Authentication type**: Choose `Bearer Token - Simple token-based auth`
5. **Initialize git repository**: `Yes` (recommended)
6. **Install dependencies**: `Yes` (recommended)

## Step 3: Navigate to Your Project

```bash
cd my-vercel-mcp-server
```

## Step 4: Explore the Generated Project

The CLI creates a complete project structure:

```
my-vercel-mcp-server/
├── src/
│   ├── server.ts          # Main MCP server
│   ├── auth/
│   │   └── token.ts       # Bearer token configuration
│   └── resources/
│       └── example.ts     # Example resource
├── api/
│   └── index.ts           # Vercel Functions entry point
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
└── README.md             # Project documentation
```

## Step 5: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set your Bearer token:

```bash
# Bearer token authentication
BEARER_TOKEN=sk-your-secure-production-token-here
```

**Important**: Use a strong, unique token in production!

## Step 6: Test Locally

```bash
# Start the development server
npm run dev

# The server will be available at http://localhost:3000
```

## Step 7: Test the API

With the server running, test the authentication:

```bash
# Test without token (should fail)
curl http://localhost:3000/api/resources

# Test with token (should succeed)
curl -H "Authorization: Bearer sk-your-secure-production-token-here" \
  http://localhost:3000/api/resources
```

## Step 8: Deploy to Vercel

```bash
# Deploy to Vercel
vercel --prod

# Follow the prompts to link to your Vercel account
# Choose your project settings when prompted
```

## Step 9: Configure Production Environment

After deployment, set your production environment variables in the Vercel dashboard:

1. Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Settings → Environment Variables
3. Add the following variables:
   - `BEARER_TOKEN`: Your production token (e.g., `sk-prod-1234567890abcdef`)
   - `SERVER_URL`: Your Vercel deployment URL (auto-set by Vercel)

## Step 10: Test Production Deployment

```bash
# Test your production API
curl -H "Authorization: Bearer sk-prod-1234567890abcdef" \
  https://your-app.vercel.app/api/resources
```

## Understanding the Generated Code

### Server Configuration (`src/server.ts`)

```typescript
import { createMCPServer } from "mcpresso";
import { tokenConfig } from "./auth/token.js";

const app = createMCPServer({
  name: "my-vercel-mcp-server",
  resources: [exampleResource],
  auth: tokenConfig,  // Bearer token authentication
  serverMetadata: {
    capabilities: {
      authentication: true,  // Indicates auth is enabled
    },
  },
});

export default app.fetch;  // Vercel Functions export
```

### Token Authentication (`src/auth/token.ts`)

```typescript
export const tokenConfig = {
  bearerToken: {
    token: process.env.BEARER_TOKEN || "sk-1234567890abcdef",
    headerName: "Authorization",
    userProfile: {
      id: "bearer-user",
      username: "api-client",
      email: "api@example.com",
      scopes: ["read", "write"]
    }
  },
};
```

## Customizing Your Server

### Adding Resources

```bash
# Add a new resource interactively
npx mcpresso add-resource

# Or manually create resources in src/resources/
```

### Modifying Authentication

Edit `src/auth/token.ts` to customize:

- Token validation logic
- User profile structure
- Error handling
- Scopes and permissions

### Adding Custom Tools

```typescript
// In your resource files
const myResource = createResource({
  name: "my_resource",
  schema: MySchema,
  methods: {
    custom_tool: {
      description: "My custom tool",
      inputSchema: z.object({
        input: z.string(),
      }),
      handler: async ({ input }, user) => {
        // Your custom logic here
        return { result: `Processed: ${input}` };
      },
    },
  },
});
```

## Troubleshooting

### Common Issues

**Deployment fails:**
- Check that `vercel.json` is in the project root
- Verify all environment variables are set in Vercel dashboard
- Check Vercel deployment logs

**Authentication fails:**
- Verify the `Authorization` header format: `Bearer <token>`
- Check that `BEARER_TOKEN` environment variable is set
- Ensure token matches exactly (case-sensitive)

**API not responding:**
- Check Vercel function logs
- Verify the API route is correct (`/api/index`)
- Test with a simple curl request first

### Getting Help

- Check the [mcpresso documentation](https://github.com/granular-software/mcpresso)
- Review [Vercel Functions documentation](https://vercel.com/docs/functions)
- Open an issue on the mcpresso GitHub repository

## Next Steps

Once your server is deployed and working:

1. **Add more resources** - Create additional data models and tools
2. **Implement custom logic** - Add business-specific handlers
3. **Set up monitoring** - Use Vercel Analytics and logging
4. **Scale up** - Vercel automatically scales with traffic
5. **Integrate with AI agents** - Connect your MCP server to AI tools

Your Vercel-hosted, token-authenticated MCP server is now ready for production use! 