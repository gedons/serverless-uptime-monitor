<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4">
    <div class="w-full max-w-md">
      <!-- Logo / Branding -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-4">
          <svg class="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Welcome back</h1>
        <p class="text-gray-400 mt-1">Sign in to your uptime monitor</p>
      </div>

      <!-- Login Form -->
      <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Email Field -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="you@example.com"
              :disabled="loading"
              class="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all duration-200 disabled:opacity-50"
            />
          </div>

          <!-- Password Field -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
              <NuxtLink
                to="/forgot-password"
                class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Forgot password?
              </NuxtLink>
            </div>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="••••••••"
              :disabled="loading"
              class="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all duration-200 disabled:opacity-50"
            />
          </div>

          <!-- Error Message -->
          <div v-if="error" class="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading || !email || !password"
            class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ loading ? "Signing in..." : "Sign in" }}</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="flex items-center my-6">
          <div class="flex-1 border-t border-gray-700/50"></div>
          <span class="px-3 text-xs text-gray-500 uppercase">or</span>
          <div class="flex-1 border-t border-gray-700/50"></div>
        </div>

        <!-- Register Link -->
        <p class="text-center text-gray-400 text-sm">
          Don't have an account?
          <NuxtLink to="/register" class="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Create one
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth';

definePageMeta({
  layout: false
});

useHead({
  title: "Sign In - Serverless Uptime Monitor"
});

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

const { signIn } = useAuth();

async function handleLogin() {
  error.value = "";
  loading.value = true;

  try {
    await signIn(email.value.trim(), password.value);
    await navigateTo("/dashboard");
  } catch (err: any) {
    // Handle Cognito-specific errors with user-friendly messages
    const msg = err.message || "Authentication failed";
    if (msg.includes("UserNotConfirmedException") || msg.includes("not confirmed")) {
      await navigateTo(`/confirm-account?email=${encodeURIComponent(email.value.trim())}`);
      return;
    }
    error.value = msg;
  } finally {
    loading.value = false;
  }
}
</script>
