# mcpresso Deployment Guide

This guide provides instructions for deploying your `mcpresso`-based server to various serverless platforms.

- [Cloudflare Workers](#cloudflare-workers)
- [Vercel Edge Functions](#vercel-edge-functions)
- [AWS Lambda](#aws-lambda)

---

## Cloudflare Workers

Hono is originally built for Cloudflare Workers, making deployment straightforward.

### 1. Configuration

Create a `wrangler.toml` file in the root of your project:

```toml
name = "my-mcpresso-worker"
main = "packages/mcpresso/dist/handlers/cloudflare.js"
compatibility_date = "2023-10-30"
node_compat = true

[build]
command = "bun run build"
```

**Note**: Adjust the `main` path to point to the compiled Cloudflare handler from your project's root. The `build` command assumes you have a script that transpiles your TypeScript source to JavaScript in the `dist` directory.

### 2. Deployment

Deploy your worker using the Cloudflare Wrangler CLI:

```bash
# First time deploying
wrangler deploy

# Subsequent deployments
wrangler deploy
```

---

## Vercel Edge Functions

Vercel's file-based routing makes it easy to deploy Hono applications to the edge.

### 1. Project Structure

For Vercel to recognize your handler, you need to place it inside an `api` directory at your project's root. You can either move `packages/mcpresso/src/handlers/vercel.ts` to `api/index.ts` in your project or use a build step to do so.

### 2. Configuration

Create a `vercel.json` file in your project root to configure the build process:

```json
{
  "functions": {
    "api/index.ts": {
      "runtime": "edge"
    }
  },
  "build": {
    "env": {
      "NODE_VERSION": "18.x"
    }
  }
}
```

This configuration tells Vercel to use the Edge Runtime for your handler.

### 3. Deployment

Deploy your project using the Vercel CLI or by connecting your Git repository to Vercel.

```bash
# Install the Vercel CLI
npm i -g vercel

# Deploy from your project's root
vercel deploy --prod
```

---

## AWS Lambda

You can run your Hono application on AWS Lambda using the Node.js runtime.

### 1. Build Your Project

First, compile your TypeScript project to JavaScript. Your `tsconfig.json` should have an `outDir` pointing to `dist`.

### 2. Package for Deployment

Create a `zip` file containing your entire `dist` directory and your production `node_modules`.

```bash
# 1. Build the project
bun run build

# 2. Install production dependencies locally
rm -rf node_modules
bun install --production

# 3. Create the deployment package
zip -r deployment.zip dist node_modules
```

### 3. Create the Lambda Function

1.  Open the [AWS Lambda console](https://console.aws.amazon.com/lambda/).
2.  Click **Create function**.
3.  Select **Author from scratch**.
4.  **Function name**: `my-mcpresso-handler`
5.  **Runtime**: `Node.js 18.x`
6.  **Architecture**: `x86_64` or `arm64` as needed.
7.  Click **Create function**.

### 4. Upload and Configure

1.  In the function's **Code source** editor, click **Upload from** and select **.zip file**. Upload your `deployment.zip`.
2.  In **Runtime settings**, click **Edit**. Change the **Handler** to `packages/mcpresso/dist/handlers/lambda.handler`. This points to the `handler` export from the compiled version of your `lambda.ts` file.
3.  Click **Save**.

### 5. Add a Trigger

To expose your Lambda function via a public URL, you need to add a trigger, such as an API Gateway.

1.  In the function overview, click **Add trigger**.
2.  Select **API Gateway**.
3.  Choose **Create a new API**.
4.  **API type**: `HTTP API`
5.  **Security**: `Open`
6.  Click **Add**.

After a moment, your API Gateway will be created, and you will see the public API endpoint URL in the trigger details. You can now send requests to this URL. 