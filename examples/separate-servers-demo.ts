import { z } from "zod";
import { MCPOAuthServer } from "../../mcpresso-oauth-server/src/oauth-server.js";
import { MemoryStorage } from "../../mcpresso-oauth-server/src/storage/memory-storage.js";
import { createMCPServer, createResource } from "../src/index.js";
import express from "express";
import cors from "cors";

// Demo users
const demoUsers = [
	{
		id: "demo-user-1",
		username: "alice@example.com",
		email: "alice@example.com",
		scopes: ["read", "write"],
		createdAt: new Date(),
		updatedAt: new Date(),
		profile: {
			name: "Alice Johnson",
			department: "Engineering",
			role: "Senior Developer",
		},
	},
	{
		id: "demo-user-2",
		username: "bob@example.com",
		email: "bob@example.com",
		scopes: ["read"],
		createdAt: new Date(),
		updatedAt: new Date(),
		profile: {
			name: "Bob Smith",
			department: "Marketing",
			role: "Content Manager",
		},
	},
];

const demoClient = {
	id: "demo-client",
	secret: "demo-secret",
	name: "Demo MCP Client",
	type: "confidential",
	redirectUris: ["http://localhost:4001/callback"],
	scopes: ["read", "write"],
	grantTypes: ["authorization_code"],
	createdAt: new Date(),
	updatedAt: new Date(),
};

// Initialize storage and add demo data
const storage = new MemoryStorage();
await storage.createClient({ ...demoClient, type: "confidential" });

for (const user of demoUsers) {
	await storage.createUser(user);
}

// =========================================
// 1. OAUTH SERVER (Port 4001) 
// =========================================
const oauthServer = new MCPOAuthServer(
	{
		issuer: "http://localhost:4001",           // OAuth server URL
		serverUrl: "http://localhost:4001",
		jwtSecret: "dev-secret-key",
		allowDynamicClientRegistration: true,
		supportedScopes: ["read", "write"],
		supportedGrantTypes: ["authorization_code"],
		auth: {
			authenticateUser: async (credentials, context) => {
				console.log(`[OAUTH] Attempting to authenticate user: ${credentials.username}`);
				const user = demoUsers.find((u) => u.username === credentials.username);
				if (user) {
					console.log(`[OAUTH] User ${credentials.username} authenticated successfully`);
					return user;
				}
				console.log(`[OAUTH] Authentication failed for ${credentials.username}`);
				return null;
			},
			getCurrentUser: async (sessionData, context) => {
				return null; // Force login for demo
			},
			renderLoginPage: async (context, error) => {
				const errorHtml = error ? `<div style="color: red; margin-bottom: 16px;">${error}</div>` : "";

				return `
					<!DOCTYPE html>
					<html>
						<head>
							<title>Separate OAuth Demo Login</title>
							<meta name="viewport" content="width=device-width, initial-scale=1">
							<style>
								body { 
									font-family: system-ui, sans-serif; 
									max-width: 500px; 
									margin: 50px auto; 
									padding: 20px;
									background: #f8f9fa;
								}
								.login-container {
									background: white;
									padding: 30px;
									border-radius: 8px;
									box-shadow: 0 2px 10px rgba(0,0,0,0.1);
								}
								.form-group { margin-bottom: 20px; }
								label { 
									display: block; 
									margin-bottom: 8px; 
									font-weight: bold;
									color: #333;
								}
								input { 
									width: 100%; 
									padding: 12px; 
									border: 1px solid #ddd; 
									border-radius: 4px; 
									font-size: 16px;
								}
								button { 
									background: #28a745; 
									color: white; 
									padding: 12px 24px; 
									border: none; 
									border-radius: 4px; 
									cursor: pointer;
									font-size: 16px;
									width: 100%;
								}
								button:hover { background: #218838; }
								.server-info {
									background: #e9ecef; 
									padding: 20px; 
									border-radius: 4px; 
									margin-bottom: 25px; 
									border-left: 4px solid #28a745;
								}
								.demo-credentials {
									background: #d1ecf1;
									padding: 15px;
									border-radius: 4px;
									margin-top: 20px;
									border-left: 4px solid #bee5eb;
								}
								.demo-credentials h4 {
									margin-top: 0;
									color: #0c5460;
								}
								.demo-credentials ul {
									margin-bottom: 0;
								}
							</style>
						</head>
						<body>
							<div class="login-container">
								<h2>🔐 OAuth Server Authentication</h2>
								<div class="server-info">
									<h4>🏛️ Separate Server Architecture</h4>
									<p><strong>OAuth Server:</strong> http://localhost:4001</p>
									<p><strong>MCP Server:</strong> http://localhost:4000</p>
									<p><strong>Client:</strong> ${context.clientId}</p>
									<p><strong>Requested Scope:</strong> ${context.scope || "Default"}</p>
								</div>
								
								${errorHtml}
								
								<form method="POST" action="/authorize">
									<input type="hidden" name="response_type" value="code">
									<input type="hidden" name="client_id" value="${context.clientId}">
									<input type="hidden" name="redirect_uri" value="${context.redirectUri}">
									<input type="hidden" name="scope" value="${context.scope || ""}">
									<input type="hidden" name="resource" value="${context.resource || ""}">
									
									<div class="form-group">
										<label for="username">Email Address:</label>
										<input type="email" id="username" name="username" required placeholder="Enter your email">
									</div>
									
									<div class="form-group">
										<label for="password">Password:</label>
										<input type="password" id="password" name="password" required placeholder="Enter your password">
									</div>
									
									<button type="submit">🚀 Login & Authorize</button>
								</form>
								
								<div class="demo-credentials">
									<h4>Demo Credentials</h4>
									<ul>
										<li><strong>Alice (Full Access):</strong> alice@example.com / any password</li>
										<li><strong>Bob (Read Only):</strong> bob@example.com / any password</li>
									</ul>
								</div>
							</div>
						</body>
					</html>
				`;
			},
		},
	},
	storage,
);

// Create OAuth-only Express app
const oauthApp = express();

// ⚠️ IMPORTANT: CORS configuration for OAuth server
oauthApp.use(cors({
	origin: true, // Allow all origins for demo
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "Accept"],
}));

oauthApp.use(express.json());
oauthApp.use(express.urlencoded({ extended: true }));

// Register OAuth endpoints on the standalone server
import { registerOAuthEndpoints } from "../../mcpresso-oauth-server/src/http-server.js";
registerOAuthEndpoints(oauthApp, oauthServer, '');

// Start OAuth server on port 4001
oauthApp.listen(4001, () => {
	console.log("🔐 OAuth Server started on http://localhost:4001");
	console.log("  • Authorization: http://localhost:4001/authorize");
	console.log("  • Token: http://localhost:4001/token");
	console.log("");
});

// =========================================
// 2. MCP SERVER (Port 4000)
// =========================================

const UserSchema = z.object({
	id: z.string(),
	username: z.string(),
	email: z.string(),
	profile: z
		.object({
			name: z.string(),
			department: z.string(),
			role: z.string(),
		})
		.optional(),
});

const userResource = createResource({
	name: "user",
	schema: UserSchema,
	uri_template: "users/{id}",
	methods: {
		get: {
			description: "Get a user by ID",
			handler: async ({ id }, user) => {
				const userData = demoUsers.find((u) => u.id === id);
				if (!userData) {
					throw new Error(`User ${id} not found`);
				}

				return {
					id: userData.id,
					username: userData.username,
					email: userData.email,
					profile: userData.profile,
				};
			},
		},

		list: {
			description: "List all users",
			handler: async (_, user) => {
				if (!user || (!("scopes" in user) && !("scope" in user))) {
					throw new Error("Authentication required");
				}

				return demoUsers.map((u) => ({
					id: u.id,
					username: u.username,
					email: u.email,
					profile: u.profile,
				}));
			},
		},

		whoami: {
			description: "Returns the authenticated user info",
			inputSchema: z.object({}),
			outputSchema: z.object({
				user: z
					.object({
						id: z.string(),
						username: z.string().optional(),
						email: z.string().optional(),
						scopes: z.array(z.string()).optional(),
						profile: z.any().optional(),
					})
					.optional(),
				jwt: z
					.object({
						sub: z.string(),
						iss: z.string(),
						scope: z.string().optional(),
						client_id: z.string().optional(),
					})
					.optional(),
				message: z.string(),
				serverInfo: z.object({
					mcpServer: z.string(),
					oauthServer: z.string(),
					architecture: z.string(),
				}),
			}),
			handler: async (_, user) => {
				const baseResponse = {
					serverInfo: {
						mcpServer: "http://localhost:4000",
						oauthServer: "http://localhost:4001", 
						architecture: "Separate Servers"
					}
				};

				if (!user) {
					return { 
						message: "No authentication provided", 
						user: undefined, 
						jwt: undefined,
						...baseResponse
					};
				}

				if ("profile" in user && user.profile) {
					return {
						message: "Authenticated with full user profile",
						user: {
							id: user.id,
							username: user.username,
							email: user.email,
							scopes: user.scopes,
							profile: user.profile,
						},
						jwt: undefined,
						...baseResponse
					};
				} else if ("sub" in user) {
					return {
						message: "Authenticated with JWT payload only",
						user: undefined,
						jwt: {
							sub: user.sub,
							iss: user.iss,
							scope: user.scope,
							client_id: user.client_id,
						},
						...baseResponse
					};
				}

				return {
					message: "Unknown user format",
					user: undefined,
					jwt: undefined,
					...baseResponse
				};
			},
		},
	},
});

// Create MCP server pointing to external OAuth server
const mcpApp = createMCPServer({
	name: "separate_servers_demo",
	resources: [userResource],
	auth: {
		// External OAuth: Point to separate OAuth server
		issuer: "http://localhost:4001",              // OAuth server URL
		serverUrl: "http://localhost:4000",           // This MCP server URL
		jwtSecret: "dev-secret-key",                  // Same secret as OAuth server
		userLookup: async (jwtPayload) => {
			console.log("[MCP] Looking up user profile for:", jwtPayload.sub);
			const fullUser = demoUsers.find((u) => u.id === jwtPayload.sub);

			if (fullUser) {
				return {
					id: fullUser.id,
					username: fullUser.username,
					email: fullUser.email,
					scopes: fullUser.scopes,
					profile: fullUser.profile,
				};
			}

			console.warn("[MCP] User not found for JWT sub:", jwtPayload.sub);
			return null;
		},
	},
});

// Start MCP server on port 4000
mcpApp.listen(4000, () => {
	console.log("🚀 MCP API Server started on http://localhost:4000");
	console.log("");
	console.log("🏗️  Architecture: Separate Servers");
	console.log("  🔐 OAuth Server: http://localhost:4001 (handles login)");
	console.log("  📡 MCP Server:   http://localhost:4000 (handles API calls)");
	console.log("");
	console.log("👥 Demo Users:");
	console.log("  • Alice (Full Access): alice@example.com / any password");
	console.log("  • Bob (Read Only): bob@example.com / any password");
	console.log("");
	console.log("🔧 Demo Client:");
	console.log("  • Client ID: demo-client");
	console.log("  • Client Secret: demo-secret");
	console.log("");
	console.log("🧪 Test OAuth Flow:");
	console.log("1. Open: http://localhost:4001/authorize?response_type=code&client_id=demo-client&redirect_uri=http://localhost:4001/callback&scope=read&resource=http://localhost:4000");
	console.log("2. Login with demo credentials");
	console.log("3. Get authorization code from callback");
	console.log("4. Exchange code for token at http://localhost:4001/token");
	console.log("5. Use token to access MCP API at http://localhost:4000");
	console.log("");
	console.log("📜 Key Differences from Integrated Mode:");
	console.log("  ✅ OAuth logic isolated on separate server");
	console.log("  ✅ MCP server only validates tokens (lighter)");
	console.log("  ✅ Better separation of concerns");
	console.log("  ✅ OAuth server can serve multiple MCP servers");
	console.log("  ❌ More complex deployment (2 servers instead of 1)");
}); 