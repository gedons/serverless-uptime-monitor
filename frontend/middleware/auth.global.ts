import { useAuth } from "~/composables/useAuth";

export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, isInitialized, initAuth } = useAuth();

  // Protected routes that require authentication
  const protectedPaths = ["/dashboard", "/monitors"];

  // Guest-only routes (logged-in users get redirected to dashboard)
  const guestOnlyPaths = ["/login", "/register", "/confirm-account", "/forgot-password"];

  const isProtected = protectedPaths.some(
    (path) => to.path === path || to.path.startsWith(path + "/")
  );

  const isGuestOnly = guestOnlyPaths.some(
    (path) => to.path === path || to.path.startsWith(path + "/")
  );

  // During SSR, browser localStorage cannot be accessed.
  // Allow page hydration on client where session restoration and route guarding take place.
  if (import.meta.server) {
    return;
  }

  // On client, only block navigation for protected routes if session is not yet initialized.
  // Guest routes transition instantly while auth initialization runs in the background.
  if (isProtected && !isInitialized.value) {
    await initAuth();
  } else if (!isInitialized.value) {
    initAuth();
  }

  // Client-side route guarding
  if (isProtected && !isAuthenticated.value) {
    return navigateTo("/login");
  }

  if (isGuestOnly && isAuthenticated.value) {
    return navigateTo("/dashboard");
  }
});
