import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { URL } from 'url';

export interface AuthConfig {
  /**
   * The issuer URL of the OIDC-compliant authorization server.
   * This is used to discover the server's public keys and validate tokens.
   * e.g., https://accounts.google.com
   */
  issuer: string;
}

/**
 * Creates an Express middleware for validating MCP access tokens.
 *
 * @param authConfig The authentication configuration.
 * @param serverUrl The canonical URL of this MCP server, used as the required 'audience'.
 * @returns An Express middleware function.
 */
export function createAuthMiddleware(authConfig: AuthConfig, serverUrl: string) {

    const JWKS = createRemoteJWKSet(
        new URL(`${authConfig.issuer}/.well-known/jwks.json`)
    );

    // Construct the metadata URL properly, handling cases where serverUrl might be empty
    let metadataUrl: string;
    try {
        if (!serverUrl) {
            // If no server URL is provided, use a default for the WWW-Authenticate header
            metadataUrl = "/.well-known/oauth-protected-resource-metadata";
        } else {
            metadataUrl = new URL('/.well-known/oauth-protected-resource-metadata', serverUrl).href;
        }
    } catch (error) {
        // Fallback if URL construction fails
        metadataUrl = "/.well-known/oauth-protected-resource-metadata";
    }

    return async (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
            return res
                .status(401)
                .header('WWW-Authenticate', `Bearer, resource_metadata_uri="${metadataUrl}"`)
                .json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.substring(7);

        try {
            const { payload } = await jwtVerify(token, JWKS, {
                issuer: authConfig.issuer,
                audience: serverUrl || undefined, // Only set audience if serverUrl is provided
            });

            // You can optionally attach the payload to the request for use in handlers
            (req as any).auth = payload;

            next();
        } catch (error: any) {
            let message = 'Invalid token';
            if (error.code === 'ERR_JWT_EXPIRED') {
                message = 'Token has expired';
            } else if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
                message = 'Token signature verification failed';
            } else if (error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
                message = `Token claim validation failed: ${error.claim} ${error.reason}`;
            }

            return res
                .status(401)
                .header('WWW-Authenticate', `Bearer error="invalid_token", error_description="${message}", resource_metadata_uri="${metadataUrl}"`)
                .json({ error: 'Token validation failed', details: message });
        }
    };
} 