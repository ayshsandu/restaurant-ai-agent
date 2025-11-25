import jwt from 'jsonwebtoken';

export class JWTProcessor {
  /**
   * Decodes a JWT token from the Authorization header without verification
   * @param authHeader The Authorization header value (e.g., "Bearer <token>")
   * @returns The decoded JWT payload, or null if invalid
   */
  decodeToken(authHeader: string | undefined): jwt.JwtPayload | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Decode without verification
      const decoded = jwt.decode(token) as jwt.JwtPayload | null;
      return decoded;
    } catch (error) {
      console.error('JWT decode failed:', error);
      return null;
    }
  }

  /**
   * Extracts the 'sub' claim from a decoded JWT payload
   * @param decoded The decoded JWT payload
   * @returns The 'sub' claim, or undefined if not available
   */
  extractSubFromDecoded(decoded: jwt.JwtPayload | null): string | undefined {
    return decoded?.sub || undefined;
  }

  /**
   * Extracts the 'act' claim from a decoded JWT payload
   * @param decoded The decoded JWT payload
   * @returns The 'act' claim, or undefined if not available
   */
  extractActFromDecoded(decoded: jwt.JwtPayload | null): string | undefined {
    return decoded?.act?.sub as string || undefined;
  }
  middleware() {
    return (req: any, res: any, next: any) => {
      const decoded = this.decodeToken(req.headers.authorization);
      const sub = this.extractSubFromDecoded(decoded);
      const act = this.extractActFromDecoded(decoded);
      const endpoint = req.path;
      const action = req.method;

      console.log(`Request - Endpoint: ${endpoint}, Action: ${action}, Sub: ${sub || 'N/A'}, Act: ${act || 'N/A'}`);

      // Attach the decoded payload to the request for later use
      req.decodedJWT = decoded;
      if (sub) {
        req.userSub = sub;
      }
      if (act) {
        req.userAct = act;
      }
      next();
    };
  }
}