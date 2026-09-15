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
let initPromise: Promise<void> | null = null;

function getUserPool(): CognitoUserPool | null {
  // Never initialize CognitoUserPool on the server as it accesses browser storage
  if (import.meta.server) return null;
  if (userPool) return userPool;

  try {
    const config = useRuntimeConfig();
    const poolId = config.public.cognitoUserPoolId as string;
    const clientId = config.public.cognitoClientId as string;

    if (!poolId || !clientId) {
      return null;
    }

    userPool = new CognitoUserPool({
      UserPoolId: poolId,
      ClientId: clientId
    });

    return userPool;
  } catch {
    return null;
  }
}

function getCognitoUser(email: string): CognitoUser | null {
  const pool = getUserPool();
  if (!pool) return null;

  return new CognitoUser({
    Username: email,
    Pool: pool
  });
}

export const useAuth = () => {
  const user = useState<AuthUser | null>("auth_user", () => null);
  const isAuthenticated = useState<boolean>("auth_is_authenticated", () => false);
  const isLoading = useState<boolean>("auth_is_loading", () => false);
  const isInitialized = useState<boolean>("auth_is_initialized", () => false);

  /**
   * Attempt to restore a valid session from browser storage on client load.
   * Fully SSR-safe: returns immediately without error during server execution.
   */
  const initAuth = (): Promise<void> => {
    if (import.meta.server) {
      user.value = null;
      isAuthenticated.value = false;
      return Promise.resolve();
    }

    if (isInitialized.value) {
      return Promise.resolve();
    }

    if (initPromise) {
      return initPromise;
    }

    isLoading.value = true;

    initPromise = new Promise((resolve) => {
      try {
        const pool = getUserPool();
        if (!pool) {
          user.value = null;
          isAuthenticated.value = false;
          isInitialized.value = true;
          isLoading.value = false;
          resolve();
          return;
        }

        const cognitoUser = pool.getCurrentUser();
        if (!cognitoUser) {
          user.value = null;
          isAuthenticated.value = false;
          isInitialized.value = true;
          isLoading.value = false;
          resolve();
          return;
        }

        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
          try {
            if (err || !session || !session.isValid()) {
              user.value = null;
              isAuthenticated.value = false;
            } else {
              const payload = session.getIdToken().decodePayload();
              user.value = {
                email: payload.email || "",
                sub: payload.sub || ""
              };
              isAuthenticated.value = true;
            }
          } catch {
            user.value = null;
            isAuthenticated.value = false;
          } finally {
            isInitialized.value = true;
            isLoading.value = false;
            resolve();
          }
        });
      } catch {
        user.value = null;
        isAuthenticated.value = false;
        isInitialized.value = true;
        isLoading.value = false;
        resolve();
      }
    });

    return initPromise;
  };

  /**
   * Sign up a new user with email and password.
   */
  const signUp = (email: string, password: string): Promise<void> => {
    if (import.meta.server) {
      return Promise.reject(new Error("Sign up is only available in the browser"));
    }

    isLoading.value = true;

    return new Promise((resolve, reject) => {
      try {
        const pool = getUserPool();
        if (!pool) {
          isLoading.value = false;
          reject(new Error("Cognito authentication is not properly configured."));
          return;
        }

        const attributeList = [
          new CognitoUserAttribute({ Name: "email", Value: email })
        ];

        pool.signUp(email, password, attributeList, [], (err, result) => {
          isLoading.value = false;
          if (err) {
            reject(new Error(err.message || "Registration failed"));
            return;
          }
          resolve();
        });
      } catch (err: any) {
        isLoading.value = false;
        reject(new Error(err.message || "Registration failed"));
      }
    });
  };

  /**
   * Confirm account with verification code sent to email.
   */
  const confirmSignUp = (email: string, code: string): Promise<void> => {
    if (import.meta.server) {
      return Promise.reject(new Error("Confirmation is only available in the browser"));
    }

    isLoading.value = true;

    return new Promise((resolve, reject) => {
      try {
        const cognitoUser = getCognitoUser(email);
        if (!cognitoUser) {
          isLoading.value = false;
          reject(new Error("Cognito authentication is not properly configured."));
          return;
        }

        cognitoUser.confirmRegistration(code, true, (err, result) => {
          isLoading.value = false;
          if (err) {
            reject(new Error(err.message || "Confirmation failed"));
            return;
          }
          resolve();
        });
      } catch (err: any) {
        isLoading.value = false;
        reject(new Error(err.message || "Confirmation failed"));
      }
    });
  };

  /**
   * Resend confirmation code to email.
   */
  const resendConfirmationCode = (email: string): Promise<void> => {
    if (import.meta.server) {
      return Promise.reject(new Error("Resending code is only available in the browser"));
    }

    isLoading.value = true;

    return new Promise((resolve, reject) => {
      try {
        const cognitoUser = getCognitoUser(email);
        if (!cognitoUser) {
          isLoading.value = false;
          reject(new Error("Cognito authentication is not properly configured."));
          return;
        }

        cognitoUser.resendConfirmationCode((err, result) => {
          isLoading.value = false;
          if (err) {
            reject(new Error(err.message || "Failed to resend code"));
            return;
          }
          resolve();
        });
      } catch (err: any) {
        isLoading.value = false;
        reject(new Error(err.message || "Failed to resend code"));
      }
    });
  };

  /**
   * Sign in with email and password.
   */
  const signIn = (email: string, password: string): Promise<void> => {
    if (import.meta.server) {
      return Promise.reject(new Error("Sign in is only available in the browser"));
    }

    isLoading.value = true;

    return new Promise((resolve, reject) => {
      try {
        const cognitoUser = getCognitoUser(email);
        if (!cognitoUser) {
          isLoading.value = false;
          reject(new Error("Cognito authentication is not properly configured."));
          return;
        }

        const authDetails = new AuthenticationDetails({
          Username: email,
          Password: password
        });

        cognitoUser.authenticateUser(authDetails, {
          onSuccess: (session: CognitoUserSession) => {
            try {
              const payload = session.getIdToken().decodePayload();
              user.value = {
                email: payload.email || "",
                sub: payload.sub || ""
              };
              isAuthenticated.value = true;
              isInitialized.value = true;
              resolve();
            } catch (e: any) {
              reject(new Error("Failed to process user session"));
            } finally {
              isLoading.value = false;
            }
          },
          onFailure: (err: Error) => {
            isLoading.value = false;
            reject(new Error(err.message || "Authentication failed"));
          }
        });
      } catch (err: any) {
        isLoading.value = false;
        reject(new Error(err.message || "Authentication failed"));
      }
    });
  };

  /**
   * Sign out and clear session.
   */
  const signOut = (): void => {
    if (import.meta.server) return;

    try {
      const pool = getUserPool();
      const cognitoUser = pool?.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }
    } catch {
      // Ignore errors during sign-out cleanup
    }

    user.value = null;
    isAuthenticated.value = false;
    isInitialized.value = true;
    initPromise = null;
    navigateTo("/login");
  };

  /**
   * Initiate forgot password flow - sends reset code to email.
   */
  const forgotPassword = (email: string): Promise<void> => {
    if (import.meta.server) {
      return Promise.reject(new Error("Password reset is only available in the browser"));
    }

    isLoading.value = true;

    return new Promise((resolve, reject) => {
      try {
        const cognitoUser = getCognitoUser(email);
        if (!cognitoUser) {
          isLoading.value = false;
          reject(new Error("Cognito authentication is not properly configured."));
          return;
        }

        cognitoUser.forgotPassword({
          onSuccess: () => {
            isLoading.value = false;
            resolve();
          },
          onFailure: (err: Error) => {
            isLoading.value = false;
            reject(new Error(err.message || "Failed to initiate password reset"));
          }
        });
      } catch (err: any) {
        isLoading.value = false;
        reject(new Error(err.message || "Failed to initiate password reset"));
      }
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
    if (import.meta.server) {
      return Promise.reject(new Error("Password reset confirmation is only available in the browser"));
    }

    isLoading.value = true;

    return new Promise((resolve, reject) => {
      try {
        const cognitoUser = getCognitoUser(email);
        if (!cognitoUser) {
          isLoading.value = false;
          reject(new Error("Cognito authentication is not properly configured."));
          return;
        }

        cognitoUser.confirmPassword(code, newPassword, {
          onSuccess: () => {
            isLoading.value = false;
            resolve();
          },
          onFailure: (err: Error) => {
            isLoading.value = false;
            reject(new Error(err.message || "Failed to reset password"));
          }
        });
      } catch (err: any) {
        isLoading.value = false;
        reject(new Error(err.message || "Failed to reset password"));
      }
    });
  };

  /**
   * Get the current Cognito ID token string for API requests.
   * Renamed from getAccessToken to getIdToken for precision.
   */
  const getIdToken = (): Promise<string | null> => {
    if (import.meta.server) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const pool = getUserPool();
        if (!pool) {
          resolve(null);
          return;
        }

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
          // REST API Cognito Authorizer expects the ID token JWT string
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
    isInitialized: readonly(isInitialized),
    initAuth,
    signUp,
    confirmSignUp,
    resendConfirmationCode,
    signIn,
    signOut,
    forgotPassword,
    confirmForgotPassword,
    getIdToken,
    getAuthToken: getIdToken // Alias for backward compatibility
  };
};
