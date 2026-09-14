<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Logo / Branding -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-4">
          <svg class="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Reset password</h1>
        <p class="text-gray-400 mt-1">
          {{ step === 1 ? "Enter your email to receive a reset code" : "Enter the code and your new password" }}
        </p>
      </div>

      <!-- Forgot Password Card -->
      <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
        <!-- Step 1: Request Code -->
        <form v-if="step === 1" @submit.prevent="handleRequestCode" class="space-y-5">
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

          <div v-if="error" class="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading || !email"
            class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ loading ? "Sending code..." : "Send Reset Code" }}</span>
          </button>
        </form>

        <!-- Step 2: Confirm Code & New Password -->
        <form v-else @submit.prevent="handleResetPassword" class="space-y-5">
          <div>
            <label for="code" class="block text-sm font-medium text-gray-300 mb-1.5">Reset Code</label>
            <input
              id="code"
              v-model="code"
              type="text"
              required
              placeholder="123456"
              maxlength="6"
              :disabled="loading"
              class="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 tracking-widest text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all duration-200 disabled:opacity-50"
            />
          </div>

          <div>
            <label for="newPassword" class="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
            <input
              id="newPassword"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              required
              placeholder="Min. 8 characters"
              :disabled="loading"
              class="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all duration-200 disabled:opacity-50"
            />
          </div>

          <div>
            <label for="confirmNewPassword" class="block text-sm font-medium text-gray-300 mb-1.5">Confirm New Password</label>
            <input
              id="confirmNewPassword"
              v-model="confirmNewPassword"
              type="password"
              autocomplete="new-password"
              required
              placeholder="Re-enter new password"
              :disabled="loading"
              class="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all duration-200 disabled:opacity-50"
            />
          </div>

          <div v-if="error" class="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading || !code || !newPassword || !confirmNewPassword"
            class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ loading ? "Resetting password..." : "Set New Password" }}</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="flex items-center my-6">
          <div class="flex-1 border-t border-gray-700/50"></div>
          <span class="px-3 text-xs text-gray-500 uppercase">or</span>
          <div class="flex-1 border-t border-gray-700/50"></div>
        </div>

        <!-- Login Link -->
        <p class="text-center text-gray-400 text-sm">
          Remember your password?
          <NuxtLink to="/login" class="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Sign in
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
  title: "Reset Password - Serverless Uptime Monitor"
});

const step = ref<1 | 2>(1);
const email = ref("");
const code = ref("");
const newPassword = ref("");
const confirmNewPassword = ref("");
const loading = ref(false);
const error = ref("");

const { forgotPassword, confirmForgotPassword } = useAuth();

async function handleRequestCode() {
  error.value = "";
  loading.value = true;

  try {
    const cleanEmail = email.value.trim();
    await forgotPassword(cleanEmail);
    step.value = 2;
  } catch (err: any) {
    error.value = err.message || "Failed to send reset code";
  } finally {
    loading.value = false;
  }
}

async function handleResetPassword() {
  error.value = "";

  if (newPassword.value !== confirmNewPassword.value) {
    error.value = "Passwords do not match";
    return;
  }

  if (newPassword.value.length < 8) {
    error.value = "Password must be at least 8 characters long";
    return;
  }

  loading.value = true;

  try {
    await confirmForgotPassword(email.value.trim(), code.value.trim(), newPassword.value);
    await navigateTo("/login");
  } catch (err: any) {
    error.value = err.message || "Password reset failed";
  } finally {
    loading.value = false;
  }
}
</script>
