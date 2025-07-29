import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { URL } from 'url';

/**
 * JWT payload from the OAuth token
 */
export interface JWTPayload {
  /** Subject (user ID) */
  sub: string;
  /** Issuer */
  iss: string;
  /** Audience */
  aud: string | string[];
  /** Expiration time */
  exp: number;
  /** Issued at */
  iat: number;
  /** Client ID */
  client_id?: string;
  /** Scope */
  scope?: string;
  /** Custom claims */
  [key: string]: any;
}

/**
 * Full user profile that will be passed to handlers
 */
export interface UserProfile {
  /** User ID (from JWT sub claim) */
  id: string;
  /** Username */
  username?: string;
  /** Email address */
  email?: string;
  /** User scopes/permissions */
  scopes?: string[];
  /** Custom user properties */
  [key: string]: any;
}

/**
 * Function to lookup user profile from JWT payload
 */
export type UserLookupFunction = (jwtPayload: JWTPayload) => Promise<UserProfile | null>;

/**
 * Configuration for MCP OAuth 2.1 authentication.
 * 
 * Four usage modes:
 * 1. External OAuth: Provide `issuer` and `userLookup`
 * 2. Integrated OAuth: Provide `oauth` server instance 
 * 3. Bearer Token: Provide `bearerToken` configuration
 * 4. No auth: Don't provide this config at all
 */
export interface MCPAuthConfig {
  /**
   * The issuer URL of the OAuth authorization server.
   * Only required for external OAuth servers.
   * For integrated OAuth, this is inherited from the oauth server.
   * 
   * @example "https://auth.example.com"
   * @example "http://localhost:4001"
   */
  issuer?: string;
  
  /**
   * Optional: The canonical URL of this MCP server, used as the required 'audience'.
   * If not provided, will be inferred from the request.
   * 
   * @example "https://api.example.com"
   * @example "http://localhost:4000"
   */
  serverUrl?: string;

  /**
   * Optional: User lookup function to fetch full user profiles.
   * When provided, this function will be called with the JWT payload
   * to fetch the complete user profile, which will then be passed
   * to all resource handlers as the second parameter.
   * 
   * @example
   * ```ts
   * {
   *   userLookup: async (jwtPayload) => {
   *     const user = await db.users.findById(jwtPayload.sub);
   *     return user ? {
   *       id: user.id,
   *       username: user.username,
   *       email: user.email,
   *       scopes: user.permissions,
   *       profile: user.profile
   *     } : null;
   *   }
   * }
   * ```
   */
  userLookup?: UserLookupFunction;

  /**
   * Optional: Integrated OAuth server.
   * When provided, OAuth endpoints are enabled on the same port,
   * and issuer/serverUrl/jwtSecret are inherited from the oauth server.
   */
  oauth?: any; // Will be properly typed as MCPOAuthServer when imported

  /**
   * Optional: Bearer token authentication configuration.
   * When provided, simple token-based authentication is used.
   * 
   * @example
   * ```ts
   * {
   *   bearerToken: {
   *     headerName: "Authorization", // Optional, defaults to "Authorization"
   *     token: "your-secret-token-here"
   *   }
   * }
   * ```
   */
  bearerToken?: {
    /**
     * Optional: Custom header name for the bearer token.
     * Defaults to "Authorization" if not provided.
     * 
     * @example "Authorization"
     * @example "X-API-Key"
     */
    headerName?: string;
    
    /**
     * The bearer token value that clients must provide.
     * This should be a secure, randomly generated token.
     * 
     * @example "sk-1234567890abcdef"
     * @example "your-secret-token-here"
     */
    token: string;
    
    /**
     * Optional: User profile to associate with authenticated requests.
     * If not provided, a default profile with id "bearer-user" will be used.
     * 
     * @example
     * ```ts
     * {
     *   id: "bearer-user",
     *   username: "api-client",
     *   email: "api@example.com",
     *   scopes: ["read", "write"]
     * }
     * ```
     */
    userProfile?: UserProfile;
  };

  /**
   * Optional: Shared secret for HS256 JWTs. 
   * Only needed for external OAuth servers.
   * For integrated OAuth, this is inherited from the oauth server.
   */
  jwtSecret?: string;

  /**
   * Optional: JWT algorithm (default HS256 if jwtSecret is provided).
   */
  jwtAlgorithm?: string;
  
  /**
   * Optional: Whether to require resource indicators (MCP requirement).
   * Resource indicators help ensure tokens are only used for their intended audience.
   * 
   * @default true
   */
  requireResourceIndicator?: boolean;
  
  /**
   * Optional: Whether to validate audience claims in JWT tokens.
   * When enabled, tokens must have an 'aud' claim matching this server's URL.
   * 
   * @default true
   */
  validateAudience?: boolean;

  /**
   * Optional: Custom JWKS endpoint path (relative to issuer).
   * If not provided, will use `/.well-known/jwks.json`
   * 
   * @example "/.well-known/jwks.json"
   * @example "/custom/jwks"
   */
  jwksEndpoint?: string;

  /**
   * Optional: Custom metadata endpoint path (relative to serverUrl).
   * If not provided, will use `/.well-known/oauth-protected-resource`
   * 
   * @example "/.well-known/oauth-protected-resource"
   * @example "/custom/metadata"
   */
  metadataEndpoint?: string;

  /**
   * Optional: JWT verification options.
   * Allows fine-tuning of JWT validation behavior.
   */
  jwtOptions?: {
    /**
     * Optional: Custom issuer validation.
     * If not provided, uses the 'issuer' field from this config.
     * 
     * @example "https://auth.example.com"
     */
    issuer?: string;
    
    /**
     * Optional: Custom audience validation.
     * If not provided, uses the 'serverUrl' field from this config.
     * 
     * @example "https://api.example.com"
     */
    audience?: string | string[];
    
    /**
     * Optional: Clock tolerance for JWT validation in seconds.
     * Useful for servers with slight time differences.
     * 
     * @default 0
     * @example 30
     */
    clockTolerance?: number;
    
    /**
     * Optional: Maximum token age in seconds.
     * Tokens older than this will be rejected regardless of expiration.
     * 
     * @example 3600 // 1 hour
     */
    maxTokenAge?: number;
  };

  /**
   * Optional: Error handling configuration.
   * Controls how authentication errors are reported.
   */
  errorHandling?: {
    /**
     * Optional: Whether to include detailed error messages in responses.
     * In production, you may want to disable this for security.
     * 
     * @default true
     */
    includeDetails?: boolean;
    
    /**
     * Optional: Custom error messages for different error types.
     */
    messages?: {
      missingToken?: string;
      invalidToken?: string;
      expiredToken?: string;
      audienceMismatch?: string;
      signatureFailure?: string;
    };
  };

  /**
   * Optional: Logging configuration.
   * Controls authentication-related logging.
   */
  logging?: {
    /**
     * Optional: Whether to log successful authentications.
     * 
     * @default false
     */
    logSuccess?: boolean;
    
    /**
     * Optional: Whether to log authentication failures.
     * 
     * @default true
     */
    logFailures?: boolean;
    
    /**
     * Optional: Whether to log token validation details.
     * 
     * @default false
     */
    logValidation?: boolean;
  };
}

/**
 * Creates an Express middleware for validating MCP access tokens.
 * This middleware implements the MCP authorization specification:
 * https://modelcontextprotocol.io/specification/draft/basic/authorization
 *
 * @param authConfig The MCP authentication configuration.
 * @param serverUrl The canonical URL of this MCP server, used as the required 'audience'.
 * @returns An Express middleware function.
 */
export function createMCPAuthMiddleware(authConfig: MCPAuthConfig, serverUrl?: string) {
  
  console.log("createMCPAuthMiddleware", authConfig, serverUrl);

  // Validate that we have either issuer, oauth server, or bearer token
  if (!authConfig.issuer && !authConfig.oauth && !authConfig.bearerToken) {
    throw new Error("MCPAuthConfig must provide either 'issuer' (for external OAuth), 'oauth' (for integrated OAuth), or 'bearerToken' (for bearer token auth)");
  }

  // Use provided serverUrl or fallback to config
  const canonicalServerUrl = serverUrl || authConfig.serverUrl;
  
  // Check if this is a bearer token authentication
  if (authConfig.bearerToken) {
    const { headerName = "Authorization", token, userProfile } = authConfig.bearerToken;
    
    return async (req: Request, res: Response, next: NextFunction) => {
      console.log("\n" + "=".repeat(60));
      console.log("🔐 BEARER TOKEN AUTH MIDDLEWARE DEBUG");
      console.log("=".repeat(60));
      console.log("📍 Request Details:");
      console.log("   URL:", req.url);
      console.log("   Method:", req.method);
      console.log("   IP:", req.ip || req.connection.remoteAddress);
      console.log("   User-Agent:", req.headers['user-agent']);
      console.log("\n🔑 Authentication Headers:");
      console.log(`   ${headerName}:`, req.headers[headerName.toLowerCase()] || "❌ MISSING");
      console.log("   MCP-Session-ID:", req.headers['mcp-session-id'] || "❌ MISSING");
      console.log("\n📨 All Request Headers:");
      Object.entries(req.headers).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      console.log("\n📦 Request Body (if any):");
      if (req.body && Object.keys(req.body).length > 0) {
        console.log("   ", JSON.stringify(req.body, null, 2));
      } else {
        console.log("   ❌ No body");
      }
      console.log("=".repeat(60));
      
      const authHeader = req.headers[headerName.toLowerCase()];
      
      // Check for Bearer token
      if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        console.log("\n❌ AUTHENTICATION FAILED");
        console.log("🚫 Reason: Missing or invalid Authorization header");
        console.log(`🔍 Expected: '${headerName}: Bearer <token>'`);
        console.log("🔍 Received:", authHeader || "undefined");
        console.log("📤 Sending 401 Unauthorized response");
        console.log("=".repeat(60) + "\n");
        
        return res
          .status(401)
          .header('WWW-Authenticate', `Bearer`)
          .json({ 
            error: 'missing_or_invalid_authorization_header',
            error_description: 'Authorization header with Bearer token is required',
            details: `${headerName} header must start with "Bearer "`
          });
      }

      const receivedToken = authHeader.substring(7);
      
      // Validate the bearer token
      if (receivedToken !== token) {
        console.log("\n❌ AUTHENTICATION FAILED");
        console.log("🚫 Reason: Invalid bearer token");
        console.log("📤 Sending 401 Unauthorized response");
        console.log("=".repeat(60) + "\n");
        
        return res
          .status(401)
          .header('WWW-Authenticate', `Bearer error="invalid_token"`)
          .json({ 
            error: 'invalid_token',
            error_description: 'Invalid bearer token'
          });
      }

      // Create user profile
      const profile: UserProfile = userProfile || {
        id: "bearer-user",
        username: "api-client",
        email: "api@example.com",
        scopes: ["read", "write"]
      };

      // Attach the user profile to the request
      (req as any).auth = profile;

      console.log("\n✅ BEARER TOKEN AUTHENTICATION SUCCESSFUL");
      console.log("👤 User Profile:");
      console.log("   ID:", profile.id);
      console.log("   Username:", profile.username || "N/A");
      console.log("   Email:", profile.email || "N/A");
      console.log("   Scopes:", profile.scopes || "N/A");
      console.log("📤 Proceeding to next middleware/handler");
      console.log("=".repeat(60) + "\n");

      next();
    };
  }
  
  // Get issuer from config or OAuth server
  const issuer = authConfig.issuer || (authConfig.oauth as any)?.config?.issuer;
  if (!issuer) {
    throw new Error("Unable to determine issuer URL from auth config");
  }
  
  // Decide verification method: JWKS (default) or shared secret (HS256)
  const jwtSecret = authConfig.jwtSecret || (authConfig.oauth as any)?.config?.jwtSecret;
  const useSharedSecret = !!jwtSecret;
  let JWKS: ReturnType<typeof createRemoteJWKSet> | Uint8Array;
  if (useSharedSecret) {
    JWKS = new TextEncoder().encode(jwtSecret);
  } else {
    const jwksEndpoint = authConfig.jwksEndpoint || `/.well-known/jwks.json`;
    const jwksUrl = new URL(jwksEndpoint, issuer);
    JWKS = createRemoteJWKSet(jwksUrl);
  }

  // Construct the metadata URL for WWW-Authenticate headers
  let metadataUrl: string;
  try {
    if (authConfig.metadataEndpoint) {
      // Use custom metadata endpoint path
      if (canonicalServerUrl) {
        metadataUrl = new URL(authConfig.metadataEndpoint, canonicalServerUrl).href;
      } else {
        metadataUrl = authConfig.metadataEndpoint;
      }
    } else if (!canonicalServerUrl) {
      metadataUrl = "/.well-known/oauth-protected-resource-metadata";
    } else {
      metadataUrl = new URL('/.well-known/oauth-protected-resource-metadata', canonicalServerUrl).href;
    }
  } catch (error) {
    metadataUrl = "/.well-known/oauth-protected-resource-metadata";
  }

  // Get default values for configuration
  const config = {
    requireResourceIndicator: authConfig.requireResourceIndicator ?? true,
    validateAudience: authConfig.validateAudience ?? true,
    errorHandling: {
      includeDetails: authConfig.errorHandling?.includeDetails ?? true,
      messages: {
        missingToken: authConfig.errorHandling?.messages?.missingToken ?? 'Authorization header with Bearer token is required',
        invalidToken: authConfig.errorHandling?.messages?.invalidToken ?? 'Invalid token',
        expiredToken: authConfig.errorHandling?.messages?.expiredToken ?? 'Token has expired',
        audienceMismatch: authConfig.errorHandling?.messages?.audienceMismatch ?? 'Token audience mismatch',
        signatureFailure: authConfig.errorHandling?.messages?.signatureFailure ?? 'Token signature verification failed',
      }
    },
    logging: {
      logSuccess: authConfig.logging?.logSuccess ?? true,
      logFailures: authConfig.logging?.logFailures ?? true,
      logValidation: authConfig.logging?.logValidation ?? true,
    }
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 AUTH MIDDLEWARE DEBUG");
    console.log("=".repeat(60));
    console.log("📍 Request Details:");
    console.log("   URL:", req.url);
    console.log("   Method:", req.method);
    console.log("   IP:", req.ip || req.connection.remoteAddress);
    console.log("   User-Agent:", req.headers['user-agent']);
    console.log("\n🔑 Authentication Headers:");
    console.log("   Authorization:", req.headers.authorization || "❌ MISSING");
    console.log("   MCP-Session-ID:", req.headers['mcp-session-id'] || "❌ MISSING");
    console.log("\n📨 All Request Headers:");
    Object.entries(req.headers).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log("\n📦 Request Body (if any):");
    if (req.body && Object.keys(req.body).length > 0) {
      console.log("   ", JSON.stringify(req.body, null, 2));
    } else {
      console.log("   ❌ No body");
    }
    console.log("=".repeat(60));
    
    const authHeader = req.headers.authorization;

    // Check for Bearer token
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      console.log("\n❌ AUTHENTICATION FAILED");
      console.log("🚫 Reason: Missing or invalid Authorization header");
      console.log("🔍 Expected: 'Authorization: Bearer <token>'");
      console.log("🔍 Received:", authHeader || "undefined");
      console.log("📤 Sending 401 Unauthorized response");
      console.log("=".repeat(60) + "\n");
      
      if (config.logging.logFailures) {
        console.log(`[AUTH] Missing or invalid authorization header from ${req.ip}`);
      }
      
      return res
        .status(401)
        .header('WWW-Authenticate', `Bearer, resource_metadata_uri="${metadataUrl}"`)
        .json({ 
          error: 'missing_or_invalid_authorization_header',
          error_description: config.errorHandling.messages.missingToken,
          ...(config.errorHandling.includeDetails && { details: 'Authorization header must start with "Bearer "' })
        });
    }

    const token = authHeader.substring(7);

    try {
      // Prepare JWT verification options
      const jwtVerifyOptions: any = {
        issuer: authConfig.jwtOptions?.issuer || issuer,
        audience: authConfig.jwtOptions?.audience || (canonicalServerUrl ? [canonicalServerUrl.replace(/\/+$/,'') , canonicalServerUrl.replace(/\/+$/,'') + '/'] : undefined),
      };

      // Add clock tolerance if specified
      if (authConfig.jwtOptions?.clockTolerance) {
        jwtVerifyOptions.clockTolerance = authConfig.jwtOptions.clockTolerance;
      }

      // Add max token age if specified
      if (authConfig.jwtOptions?.maxTokenAge) {
        jwtVerifyOptions.maxTokenAge = authConfig.jwtOptions.maxTokenAge;
      }

      if (config.logging.logValidation) {
        console.log(`[AUTH] Validating token with options:`, {
          issuer: jwtVerifyOptions.issuer,
          audience: jwtVerifyOptions.audience,
          clockTolerance: jwtVerifyOptions.clockTolerance,
          maxTokenAge: jwtVerifyOptions.maxTokenAge
        });
      }

      // Get JWT algorithm
      const jwtAlgorithm = authConfig.jwtAlgorithm || (authConfig.oauth as any)?.config?.jwtAlgorithm || 'HS256';

      // Validate JWT token
      const { payload } = useSharedSecret
        ? await jwtVerify(token, JWKS as Uint8Array, {
            algorithms: [jwtAlgorithm as any],
            issuer: jwtVerifyOptions.issuer,
          })
        : await jwtVerify(token, JWKS as any, jwtVerifyOptions);

      if (config.logging.logValidation) {
        console.log('[AUTH] Token payload aud:', payload.aud);
      }

      // MCP-specific: Validate audience if required
      if (config.validateAudience && canonicalServerUrl) {
        const aud = payload.aud ? (Array.isArray(payload.aud)? payload.aud.map((a:any)=> (typeof a==='string'? a.replace(/\/+$/,'') : a)) : (typeof payload.aud==='string' ? [payload.aud.replace(/\/+$/,'')] : [])) : undefined;
        const audiences = aud as string[];
        const canonicalNormalized = canonicalServerUrl.replace(/\/+$/,'');
        if (config.logging.logValidation) {
          console.log('[AUTH] Normalized audiences:', audiences, ' Expected:', canonicalNormalized);
        }
        if (!audiences.includes(canonicalNormalized)) {
          if (config.logging.logFailures) {
            console.log(`[AUTH] Token audience mismatch from ${req.ip}. Expected: ${canonicalServerUrl}, Got: ${audiences.join(', ')}`);
          }
          
          return res
            .status(401)
            .header('WWW-Authenticate', `Bearer error="invalid_token", error_description="${config.errorHandling.messages.audienceMismatch}", resource_metadata_uri="${metadataUrl}"`)
            .json({ 
              error: 'invalid_token',
              error_description: config.errorHandling.messages.audienceMismatch,
              ...(config.errorHandling.includeDetails && { details: `Expected audience: ${canonicalServerUrl}, Got: ${audiences.join(', ')}` })
            });
        }
      }

      // Log successful authentication if enabled
      if (config.logging.logSuccess) {
        console.log(`[AUTH] Successful authentication for user ${payload.sub} from ${req.ip}`);
      }

      // Fetch full user profile if userLookup function is provided
      let userProfile: UserProfile | JWTPayload = payload as JWTPayload;
      
      if (authConfig.userLookup) {
        try {
          const fetchedProfile = await authConfig.userLookup(payload as JWTPayload);
          if (fetchedProfile) {
            userProfile = fetchedProfile;
          } else {
            console.warn(`[AUTH] User lookup returned null for user ${payload.sub}`);
          }
        } catch (error) {
          console.error(`[AUTH] Error fetching user profile for ${payload.sub}:`, error);
          // Continue with JWT payload as fallback
        }
      }

      // Attach the user profile (or JWT payload as fallback) to the request for use in handlers
      (req as any).auth = userProfile;

      console.log("\n✅ AUTHENTICATION SUCCESSFUL");
      console.log("👤 User Profile:");
      console.log("   ID:", userProfile.id || (userProfile as any).sub);
      console.log("   Username:", userProfile.username || "N/A");
      console.log("   Email:", userProfile.email || "N/A");
      console.log("   Scopes:", userProfile.scopes || (userProfile as any).scope || "N/A");
      console.log("📤 Proceeding to next middleware/handler");
      console.log("=".repeat(60) + "\n");

      next();
    } catch (error: any) {
      let message = config.errorHandling.messages.invalidToken;
      let errorCode = 'invalid_token';
      
      if (error.code === 'ERR_JWT_EXPIRED') {
        message = config.errorHandling.messages.expiredToken;
        errorCode = 'invalid_token';
      } else if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        message = config.errorHandling.messages.signatureFailure;
        errorCode = 'invalid_token';
      } else if (error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
        message = `Token claim validation failed: ${error.claim} ${error.reason}`;
        errorCode = 'invalid_token';
      } else if (error.code === 'ERR_JWT_MALFORMED') {
        message = 'Malformed token';
        errorCode = 'invalid_token';
      }

      if (config.logging.logFailures) {
        console.log(`[AUTH] Authentication failed from ${req.ip}: ${message}`, {
          errorCode: error.code,
          claim: error.claim,
          reason: error.reason
        });
      }

      return res
        .status(401)
        .header('WWW-Authenticate', `Bearer error="${errorCode}", error_description="${message}", resource_metadata_uri="${metadataUrl}"`)
        .json({ 
          error: errorCode,
          error_description: message,
          ...(config.errorHandling.includeDetails && { 
            details: error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' 
              ? `Claim: ${error.claim}, Reason: ${error.reason}`
              : `Error code: ${error.code}`
          })
        });
    }
  };
}

/**
 * Creates the MCP Protected Resource Metadata endpoint.
 * This implements RFC 9728 as required by the MCP specification.
 *
 * @param authConfig The MCP authentication configuration.
 * @param serverUrl The canonical URL of this MCP server.
 * @returns An Express route handler for the metadata endpoint.
 */
export function createMCPProtectedResourceMetadataHandler(authConfig: MCPAuthConfig, serverUrl?: string) {
  const canonicalServerUrl = serverUrl || authConfig.serverUrl;
  
  return (req: Request, res: Response) => {
    if (!canonicalServerUrl) {
      return res.status(500).json({
        error: 'server_configuration_error',
        error_description: 'Server URL not configured'
      });
    }

    // Handle bearer token authentication
    if (authConfig.bearerToken) {
      const metadata = {
        resource: canonicalServerUrl,
        authorization_servers: [],
        scopes_supported: ['read', 'write', 'admin'],
        bearer_methods_supported: ['Authorization header'],
        auth_type: 'bearer_token'
      };

      return res.json(metadata);
    }

    // Handle OAuth authentication
    const metadata = {
      resource: canonicalServerUrl,
      authorization_servers: [authConfig.issuer],
      scopes_supported: ['read', 'write', 'admin'],
      bearer_methods_supported: ['Authorization header']
    };

    res.json(metadata);
  };
}

// Backward compatibility: Export the old interface as deprecated
export interface AuthConfig {
  /**
   * @deprecated Use MCPAuthConfig instead
   */
  issuer: string;
}

/**
 * @deprecated Use createMCPAuthMiddleware instead
 */
export function createAuthMiddleware(authConfig: AuthConfig, serverUrl: string) {
  console.warn('createAuthMiddleware is deprecated. Use createMCPAuthMiddleware instead.');
  
  const mcpConfig: MCPAuthConfig = {
    issuer: authConfig.issuer,
    serverUrl,
    requireResourceIndicator: true,
    validateAudience: true
  };
  
  return createMCPAuthMiddleware(mcpConfig, serverUrl);
} 