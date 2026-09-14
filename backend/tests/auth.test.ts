import { describe, it, expect } from "vitest";
import { getAuthenticatedUserId } from "../src/utils/auth.js";
import { APIGatewayProxyEvent } from "aws-lambda";

describe("auth - getAuthenticatedUserId", () => {
  it("should extract sub claim from API Gateway Cognito authorizer", () => {
    const event = {
      requestContext: {
        authorizer: {
          claims: {
            sub: "user_cognito_12345"
          }
        }
      }
    } as unknown as APIGatewayProxyEvent;

    const userId = getAuthenticatedUserId(event);
    expect(userId).toBe("user_cognito_12345");
  });

  it("should extract sub claim from HTTP API JWT authorizer fallback", () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: "user_jwt_sub_999"
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent;

    const userId = getAuthenticatedUserId(event);
    expect(userId).toBe("user_jwt_sub_999");
  });

  it("should throw an error if no authorizer claims or sub exist", () => {
    const event = {
      requestContext: {}
    } as unknown as APIGatewayProxyEvent;

    expect(() => getAuthenticatedUserId(event)).toThrow(
      "Unauthorized: Missing authenticated user identity"
    );
  });
});
