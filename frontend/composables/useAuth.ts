import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession
} from "amazon-cognito-identity-js";

interface AuthUser {
  email: string;
  sub: string;
}

let userPool: CognitoUserPool | null = null;

function getUserPool(): CognitoUserPool {
  if (userPool) return userPool;

  const config = useRuntimeConfig();
  const poolId = config.public.cognitoUserPoolId as string;
  const clientId = config.public.cognitoClientId as string;

  if (!poolId || !clientId) {
    throw new Error("Cognito configuration is missing. Set NUXT_PUBLIC_COGNITO_USER_POOL_ID and NUXT_PUBLIC_COGNITO_CLIENT_ID.");
  }

  userPool = new CognitoUserPool({
    UserPoolId: poolId,
    ClientId: clientId
  });

  return userPool;
}

function getCognitoUser(email: string): CognitoUser {
  return new CognitoUser({
    Username: email,
    Pool: getUserPool()
  });
}

export const useAuth = () => {
  const user = useState<AuthUser | null>("auth_user", () => null);
  const isAuthenticated = useState<boolean>("auth_is_authenticated", () => false);
  const isLoading = useState<boolean>("auth_is_loading", () => false);

  /**
   * Attempt to restore a valid session from browser storage on load.
   */
  const initAuth = (): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const pool = getUserPool();
        const cognitoUser = pool.getCurrentUser();

        if (!cognitoUser) {
          user.value = null;
          isAuthenticated.value = false;
          resolve();
          return;
        }

        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session || !session.isValid()) {
            user.value = null;
            isAuthenticated.value = false;
            resolve();
            return;
          }

          const payload = session.getIdToken().decodePayload();
          user.value = {
            email: payload.email || "",
            sub: payload.sub || ""
          };
          isAuthenticated.value = true;
          resolve();
        });
      } catch {
        user.value = null;
        isAuthenticated.value = false;
        resolve();
      }
    });
  };

  /**
   * Sign up a new user with email and password.
   */
  const signUp = (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: "email", Value: email })
      ];

      getUserPool().signUp(email, password, attributeList, [], (err, result) => {
        if (err) {
          reject(new Error(err.message || "Registration failed"));
          return;
        }
        resolve();
      });
    });
  };

  /**
   * Confirm account with verification code sent to email.
   */
  const confirmSignUp = (email: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = getCognitoUser(email);

      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          reject(new Error(err.message || "Confirmation failed"));
          return;
        }
        resolve();
      });
    });
  };

  /**
   * Resend confirmation code to email.
   */
  const resendConfirmationCode = (email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = getCognitoUser(email);

      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          reject(new Error(err.message || "Failed to resend code"));
          return;
        }
        resolve();
      });
    });
  };

  /**
   * Sign in with email and password.
   */
  const signIn = (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = getCognitoUser(email);
      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session: CognitoUserSession) => {
          const payload = session.getIdToken().decodePayload();
          user.value = {
            email: payload.email || "",
            sub: payload.sub || ""
          };
          isAuthenticated.value = true;
          resolve();
        },
        onFailure: (err: Error) => {
          reject(new Error(err.message || "Authentication failed"));
        }
      });
    });
  };

  /**
   * Sign out and clear session.
   */
  const signOut = (): void => {
    try {
      const pool = getUserPool();
      const cognitoUser = pool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }
    } catch {
      // Ignore errors during sign-out cleanup
    }

    user.value = null;
    isAuthenticated.value = false;
    navigateTo("/login");
  };

  /**
   * Initiate forgot password flow - sends reset code to email.
   */
  const forgotPassword = (email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = getCognitoUser(email);

      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve();
        },
        onFailure: (err: Error) => {
          reject(new Error(err.message || "Failed to initiate password reset"));
        }
      });
    });
  };

  /**
   * Confirm forgot password with code and new password.
   */
  const confirmForgotPassword = (
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = getCognitoUser(email);

      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve();
        },
        onFailure: (err: Error) => {
          reject(new Error(err.message || "Failed to reset password"));
        }
      });
    });
  };

  /**
   * Get the current access token for API requests.
   * Returns the ID token JWT string (API Gateway Cognito Authorizer expects ID token).
   */
  const getAccessToken = (): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const pool = getUserPool();
        const cognitoUser = pool.getCurrentUser();

        if (!cognitoUser) {
          resolve(null);
          return;
        }

        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session || !session.isValid()) {
            resolve(null);
            return;
          }
          // REST API Cognito Authorizer uses the ID Token
          resolve(session.getIdToken().getJwtToken());
        });
      } catch {
        resolve(null);
      }
    });
  };

  return {
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    initAuth,
    signUp,
    confirmSignUp,
    resendConfirmationCode,
    signIn,
    signOut,
    forgotPassword,
    confirmForgotPassword,
    getAccessToken
  };
};
