# Getting Started

Get up and running with mcpresso in minutes.

## Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

## Quick Start

### 1. Create a New Project
```bash
npx mcpresso init my-server
cd my-server
```

This creates a complete project with:
- Express.js server with MCP integration
- TypeScript configuration
- Example resources
- Development scripts

### 2. Start the Development Server
```bash
npm run dev
```

Your MCP server is now running at `http://localhost:3000`.

### 3. Test Your Server
Open a new terminal and test the health endpoint:
```bash
curl http://localhost:3000/health
```

You should see a response indicating your server is healthy.

## What Just Happened?

mcpresso created a working MCP server with:
- ✅ MCP protocol compliance
- ✅ Server-side events
- ✅ SSE streaming support
- ✅ Health check endpoint
- ✅ Example resources

## Project Structure

```
my-server/
├── src/
│   ├── server.ts          # Main server file
│   ├── resources/         # MCP resources
│   └── storage/           # Data storage
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript config
└── .env.example           # Environment variables
```

## Your First Resource

The template includes example resources. Open `src/resources/` to see how they're defined.

Each resource automatically creates:
- MCP tools (get, list, create, update, delete)
- HTTP endpoints
- Request validation
- Type-safe responses

## Next Steps

1. **Explore the examples** - See working code in the [examples](../examples/) directory
2. **Learn core concepts** - Understand resources, schemas, and authentication
3. **Customize resources** - Modify the examples or add new ones
4. **Add authentication** - Secure your server with OAuth or bearer tokens
5. **Deploy to production** - Use the Docker templates for deployment

## Need Help?

- **Examples**: Start with [hello-world](../examples/hello-world.ts)
- **Core Concepts**: Read the [core concepts guide](./core-concepts.md)
- **CLI Help**: Run `npx mcpresso --help`
- **Issues**: Report problems on GitHub 