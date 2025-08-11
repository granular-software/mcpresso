import { z } from "zod";
import { MCPOAuthServer } from "../../mcpresso-oauth-server/src/oauth-server.js";
import { MemoryStorage } from "../../mcpresso-oauth-server/src/storage/memory-storage.js";
import { createMCPServer, createResource } from "../src/index.js";

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
	redirectUris: ["http://localhost:4000/callback"],
	scopes: ["read", "write"],
	grantTypes: ["authorization_code"],
	createdAt: new Date(),
	updatedAt: new Date(),
};

const storage = new MemoryStorage();
await storage.createClient({ ...demoClient, type: "confidential" });

for (const user of demoUsers) {
	await storage.createUser(user);
}

const oauthServer = new MCPOAuthServer(
	{
		issuer: "http://localhost:4000",
		serverUrl: "http://localhost:4000",
		jwtSecret: "dev-secret-key",
		allowDynamicClientRegistration: true,
		supportedScopes: ["read", "write"],
		supportedGrantTypes: ["authorization_code"],
		auth: {
			authenticateUser: async (credentials, context) => {
				console.log(`[AUTH] Attempting to authenticate user: ${credentials.username}`);
				const user = demoUsers.find((u) => u.username === credentials.username);
				if (user) {
					console.log(`[AUTH] User ${credentials.username} authenticated successfully`);
					return user;
				}
				console.log(`[AUTH] Authentication failed for ${credentials.username}`);
				return null;
			},
			getCurrentUser: async (sessionData, context) => {
				return null;
			},
			renderLoginPage: async (context, error) => {
				const errorHtml = error ? `<div style="color: red; margin-bottom: 16px;">${error}</div>` : "";

				return `
					<!DOCTYPE html>
					<html>
						<head>
							<title>MCP Demo Login</title>
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
									background: #007bff; 
									color: white; 
									padding: 12px 24px; 
									border: none; 
									border-radius: 4px; 
									cursor: pointer;
									font-size: 16px;
									width: 100%;
								}
								button:hover { background: #0056b3; }
								.client-info { 
									background: #e9ecef; 
									padding: 20px; 
									border-radius: 4px; 
									margin-bottom: 25px; 
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
								<h2>MCP Demo Authentication</h2>
								
								<div class="client-info">
									<h3>Authorization Request</h3>
									<p><strong>Client:</strong> ${context.clientId}</p>
									<p><strong>Requested Scope:</strong> ${context.scope || "Default"}</p>
									<p><strong>Resource:</strong> ${context.resource || "Default"}</p>
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
									
									<button type="submit">Login & Authorize</button>
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
			}),
			handler: async (_, user) => {
				if (!user) {
					return { message: "No authentication provided", user: undefined, jwt: undefined };
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
					};
				}

				return {
					message: "Unknown user format",
					user: undefined,
					jwt: undefined,
				};
			},
		},
	},
});

const app = createMCPServer({
	name: "simple_oauth_demo_server",
	resources: [userResource],
	auth: {
		// Integrated OAuth: OAuth server runs on same port as MCP server
		oauth: oauthServer,
		serverUrl: "http://localhost:4000",
		userLookup: async (jwtPayload) => {
			console.log("Looking up user profile for:", jwtPayload.sub);
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

			console.warn("User not found for JWT sub:", jwtPayload.sub);
			return null;
		},
	},
});

app.listen(4000, () => {
	console.log("🚀 OAuth+MCP Demo Server started!");
	console.log("");
	console.log("📊 Server Details:");
	console.log("  • OAuth + MCP Server: http://localhost:4000");
	console.log("  • OAuth Authorization: http://localhost:4000/authorize");
	console.log("  • OAuth Token: http://localhost:4000/token");
	console.log("");
	console.log("👥 Demo Users:");
	console.log("  • Alice (Full Access): alice@example.com / any password");
	console.log("  • Bob (Read Only): bob@example.com / any password");
	console.log("");
	console.log("🔧 Demo Client:");
	console.log("  • Client ID: demo-client");
	console.log("  • Client Secret: demo-secret");
});
