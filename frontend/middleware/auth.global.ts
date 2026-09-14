import { useAuth } from "~/composables/useAuth";

export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, initAuth } = useAuth();

  // Protected routes that require authentication
  const protectedPaths = ["/dashboard", "/monitors"];

  // Guest-only routes (logged-in users get redirected to dashboard)
  const guestOnlyPaths = ["/login", "/register", "/confirm-account", "/forgot-password"];

  // Restore session from local storage if not already done
  if (!isAuthenticated.value) {
    await initAuth();
  }

  const isProtected = protectedPaths.some(
    (path) => to.path === path || to.path.startsWith(path + "/")
  );

  const isGuestOnly = guestOnlyPaths.some(
    (path) => to.path === path || to.path.startsWith(path + "/")
  );

  // Redirect unauthenticated users away from protected pages
  if (isProtected && !isAuthenticated.value) {
    return navigateTo("/login");
  }

  // Redirect authenticated users away from guest-only pages
  if (isGuestOnly && isAuthenticated.value) {
    return navigateTo("/dashboard");
  }
});
