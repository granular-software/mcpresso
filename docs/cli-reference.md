# MCPresso CLI Reference

Quick reference for all MCPresso CLI commands and their options.

## Commands Overview

```bash
npx mcpresso init          # Create a new project
npx mcpresso dev           # Start development server
npx mcpresso build         # Build for production
npx mcpresso deploy        # Deploy to production
npx mcpresso add-resource  # Add a new resource
npx mcpresso generate      # Generate from OpenAPI spec
```

## `npx mcpresso init`

Creates a new MCPresso project with interactive prompts.

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-y, --yes` | Skip prompts and use defaults | `false` |
| `-t, --template <template>` | Template to use | `vercel` |
| `-n, --name <name>` | Project name | `my-mcpresso-server` |
| `--oauth` | Enable OAuth 2.1 authentication | `false` |

### Templates

- `vercel` - Vercel Functions (Edge runtime)
- `cloudflare` - Cloudflare Workers (Global edge)
- `aws-lambda` - AWS Lambda (Serverless)
- `docker` - Docker Container (Self-hosted)
- `express` - Express Server (Traditional)

### Examples

```bash
# Interactive setup
npx mcpresso init

# Quick setup with defaults
npx mcpresso init -y

# Specific template
npx mcpresso init -t vercel -n my-api

# With OAuth enabled
npx mcpresso init --oauth
```

## `npx mcpresso dev`

Starts the development server with hot reload.

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <port>` | Port to run on | `3000` |
| `-h, --host <host>` | Host to bind to | `localhost` |

### Examples

```bash
# Default development server
npx mcpresso dev

# Custom port
npx mcpresso dev -p 4000

# Custom host
npx mcpresso dev -h 0.0.0.0
```

## `npx mcpresso build`

Builds the project for production.

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--clean` | Clean build directory before building | `false` |

### Examples

```bash
# Standard build
npx mcpresso build

# Clean build
npx mcpresso build --clean
```

## `npx mcpresso deploy`

Deploys your server to production.

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --platform <platform>` | Deployment platform | Auto-detect |
| `-y, --yes` | Skip confirmation prompts | `false` |

### Platforms

- `vercel` - Deploy to Vercel Functions
- `cloudflare` - Deploy to Cloudflare Workers
- `aws-lambda` - Deploy to AWS Lambda
- `docker` - Deploy using Docker Compose

### Examples

```bash
# Auto-detect platform and deploy
npx mcpresso deploy

# Deploy to specific platform
npx mcpresso deploy -p vercel

# Deploy without confirmation
npx mcpresso deploy -y
```

## `npx mcpresso add-resource`

Adds a new resource to your MCP server interactively.

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <name>` | Resource name | Interactive |
| `-y, --yes` | Skip prompts and use defaults | `false` |

### Interactive Prompts

1. **Resource name** - The name of your resource (e.g., `user`, `product`)
2. **Description** - What this resource represents
3. **Fields** - Schema fields with types and validation
4. **Methods** - Which CRUD operations to include

### Examples

```bash
# Interactive resource creation
npx mcpresso add-resource

# Quick resource with defaults
npx mcpresso add-resource -n user -y
```

## `npx mcpresso generate`

Generates an MCP server from OpenAPI specification.

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --source <path>` | OpenAPI spec file path | Interactive |
| `-o, --output <path>` | Output directory | Interactive |
| `-n, --name <name>` | Project name | Interactive |
| `--oauth` | Enable OAuth 2.1 | `false` |

### Examples

```bash
# Interactive generation
npx mcpresso generate

# Generate from specific file
npx mcpresso generate -s api-spec.json -o my-server

# Generate with OAuth
npx mcpresso generate --oauth
```

## Environment Variables

### Common Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
SERVER_URL=http://localhost:3000
```

### OAuth Variables (if enabled)

```bash
# OAuth Configuration
OAUTH_ISSUER=http://localhost:3000
JWT_SECRET=your-secret-key-change-this-in-production
```

### Platform-Specific Variables

| Platform | Variables | Auto-set by |
|----------|-----------|-------------|
| Vercel | `SERVER_URL` | Vercel |
| Cloudflare | `SERVER_URL` | Cloudflare |
| AWS Lambda | `SERVER_URL`, `AWS_REGION` | AWS |
| Docker | `NODE_ENV`, `PORT`, `SERVER_URL` | Manual |
| Express | `NODE_ENV`, `PORT`, `SERVER_URL` | Manual |

## Project Scripts

Each generated project includes these npm scripts:

```json
{
  "scripts": {
    "dev": "bun run --watch src/server.ts",
    "build": "bun build src/server.ts --outdir dist --target node",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "deploy": "platform-specific-deploy-command"
  }
}
```

## Troubleshooting

### Common Issues

**CLI not found:**
```bash
# Install globally
npm install -g mcpresso

# Or use npx (recommended)
npx mcpresso init
```

**Build fails:**
```bash
# Install dependencies
npm install

# Check TypeScript errors
npm run typecheck
```

**Deployment fails:**
- Verify platform credentials are configured
- Check network connectivity
- Review platform-specific logs

### Getting Help

- Check the [Get Started Guide](./get-started.md)
- Review the [main documentation](../README.md)
- Open an issue on GitHub 