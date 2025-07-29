# mcpresso Deployment Guide

This guide provides step-by-step instructions for deploying your `mcpresso`-based MCP server to various platforms.

## 🚀 Quick Start

The easiest way to deploy is using the mcpresso CLI:

```bash
# Create a new project with your chosen platform
npx mcpresso init

# Follow the prompts to configure your server
# Choose your deployment platform (Vercel, Cloudflare, AWS Lambda, Docker)
# Optionally enable OAuth 2.1 authentication

# Deploy to production
npm run deploy
```

That's it! Your MCP server will be live in minutes. 🎉

---

## 📋 Manual Setup

If you prefer manual setup or need to customize your deployment:

### 1. Create a New Project

```bash
# Create a new mcpresso project
npx mcpresso init

# Choose your template and configuration
# The CLI will set up everything for you
```

### 2. Customize Your Server

Edit the generated files in your project:

- `src/server.ts` - Main server configuration
- `src/resources/` - Your MCP resources
- `src/auth/oauth.ts` - OAuth configuration (if enabled)

### 3. Deploy

```bash
# Deploy using the CLI
npx mcpresso deploy

# Or use platform-specific commands
npm run deploy
```

---

## 🎯 Platform-Specific Guides

### Vercel Functions

**Best for**: Beginners, quick prototypes, and projects with moderate traffic.

#### Prerequisites
- Node.js 18+ installed
- A Vercel account (free tier available)

#### Deployment

1. **Create project with Vercel template**:
   ```bash
   npx mcpresso init
   # Choose "Vercel Functions" template
   ```

2. **Deploy**:
   ```bash
   npm run deploy
   # Or: npx mcpresso deploy
   ```

#### Features
- ✅ Edge runtime for fast response times
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Free tier: 100GB bandwidth/month
- ✅ Automatic deployments from Git

---

### Cloudflare Workers

**Best for**: Global performance, high-traffic applications, and edge computing needs.

#### Prerequisites
- Node.js 18+ installed
- A Cloudflare account (free tier available)

#### Deployment

1. **Create project with Cloudflare template**:
   ```bash
   npx mcpresso init
   # Choose "Cloudflare Workers" template
   ```

2. **Deploy**:
   ```bash
   npm run deploy
   # Or: npx mcpresso deploy
   ```

#### Features
- ✅ Runs on Cloudflare's global edge network
- ✅ Sub-10ms cold starts
- ✅ Free tier: 100,000 requests/day
- ✅ Automatic scaling
- ✅ Built-in DDoS protection

---

### AWS Lambda

**Best for**: Enterprise applications, complex integrations, and when you need full AWS ecosystem access.

#### Prerequisites
- Node.js 18+ installed
- AWS CLI installed and configured
- AWS account with Lambda permissions

#### Deployment

1. **Create project with AWS Lambda template**:
   ```bash
   npx mcpresso init
   # Choose "AWS Lambda" template
   ```

2. **Deploy**:
   ```bash
   npm run deploy
   # Or: npx mcpresso deploy
   ```

#### Features
- ✅ Pay-per-request pricing
- ✅ Integration with AWS services
- ✅ Custom domain support
- ✅ Advanced monitoring and logging
- ✅ VPC integration available

---

### Docker Container

**Best for**: Self-hosting, custom infrastructure, and when you need full control over your deployment environment.

#### Prerequisites
- Docker installed
- Docker Compose (optional, for easier management)

#### Deployment

1. **Create project with Docker template**:
   ```bash
   npx mcpresso init
   # Choose "Docker Container" template
   ```

2. **Deploy**:
   ```bash
   npm run docker:deploy
   # Or: npx mcpresso deploy
   ```

#### Features
- ✅ Full control over environment
- ✅ Can run anywhere Docker is supported
- ✅ Easy local development
- ✅ No vendor lock-in
- ✅ Custom networking and storage

---

## 🔧 Configuration

### Environment Variables

Set these environment variables for your deployment:

- `SERVER_URL`: Your server's public URL (required for resource URIs)
- `NODE_ENV`: Set to `production` for production deployments
- `PORT`: Port to run on (for Docker deployments)

### Server Configuration Options

```typescript
const app = createMCPServer({
  name: "my-server",
  serverUrl: "https://your-server.com",
  resources: [/* your resources */],
  exposeTypes: true,                // Expose JSON schemas
  
  // Optional configurations
  auth: { /* authentication config */ },
  rateLimit: { /* rate limiting config */ },
  retry: { /* retry config */ },
  serverMetadata: { /* server metadata */ },
});
```

### Authentication

To add authentication to your server:

```typescript
const app = createMCPServer({
  // ... other config
  auth: {
    // External OAuth
    issuer: "https://your-auth-provider.com",
    userLookup: async (token) => {
      // Return user profile
    },
    
    // Or integrated OAuth
    oauthServer: new MCPOAuthServer({
      // OAuth configuration
    }),
  },
});
```

---

## 🚨 Troubleshooting

### Common Issues

**Build fails**:
- Ensure all dependencies are installed: `npm install`
- Check TypeScript errors: `npm run typecheck`

**Deployment fails**:
- Verify your platform credentials are configured
- Check network connectivity
- Review platform-specific logs

**Server not responding**:
- Verify the handler path is correct
- Check environment variables
- Review server logs

### Platform-Specific Issues

**Vercel**:
- Ensure `vercel.json` is in project root
- Check API directory structure

**Cloudflare**:
- Verify `wrangler.toml` configuration
- Check worker name is unique

**AWS Lambda**:
- Verify handler path: `src/handler.handler`
- Check runtime is Node.js 18.x
- Ensure API Gateway trigger is configured

**Docker**:
- Check Docker is running
- Verify port 3000 is available
- Review container logs

---

## 🎯 Next Steps

After deployment:

1. **Test your server** with an MCP client
2. **Set up monitoring** for your chosen platform
3. **Configure custom domains** if needed
4. **Set up CI/CD** for automatic deployments
5. **Add authentication** if required
6. **Scale your resources** based on usage

Your MCP server is now ready to serve AI agents and applications! 🚀 