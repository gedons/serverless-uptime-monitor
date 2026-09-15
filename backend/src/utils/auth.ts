import { APIGatewayProxyEvent } from "aws-lambda";

export function getAuthenticatedUserId(event: APIGatewayProxyEvent): string {
  // API Gateway REST API Cognito Authorizer format:
  // event.requestContext.authorizer.claims.sub
  const claims = event.requestContext?.authorizer?.claims;
  if (claims && typeof claims.sub === "string" && claims.sub.trim().length > 0) {
    return claims.sub;
  }

  // API Gateway HTTP API / JWT Authorizer fallback format:
  const jwtClaims = (event.requestContext?.authorizer as any)?.jwt?.claims;
  if (jwtClaims && typeof jwtClaims.sub === "string" && jwtClaims.sub.trim().length > 0) {
    return jwtClaims.sub;
  }

  // Fallback for local dev/testing if test header is passed
  const devUserId = event.headers?.["x-dev-user-id"] || event.headers?.["X-Dev-User-Id"];
  if (process.env.NODE_ENV === "test" && typeof devUserId === "string" && devUserId.length > 0) {
    return devUserId;
  }

  throw new Error("Unauthorized: Missing authenticated user identity");
}

export function getAuthenticatedUserEmail(event: APIGatewayProxyEvent): string | undefined {
  const claims = event.requestContext?.authorizer?.claims;
  if (claims && typeof claims.email === "string" && claims.email.trim().length > 0) {
    return claims.email.trim();
  }

  const jwtClaims = (event.requestContext?.authorizer as any)?.jwt?.claims;
  if (jwtClaims && typeof jwtClaims.email === "string" && jwtClaims.email.trim().length > 0) {
    return jwtClaims.email.trim();
  }

  return undefined;
}
