<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Logo / Branding -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-4">
          <svg class="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Verify your email</h1>
        <p class="text-gray-400 mt-1">We sent a verification code to your email</p>
      </div>

      <!-- Confirm Form -->
      <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
        <form @submit.prevent="handleConfirm" class="space-y-5">
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

          <!-- Code Field -->
          <div>
            <label for="code" class="block text-sm font-medium text-gray-300 mb-1.5">Verification Code</label>
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

          <!-- Success Info Message -->
          <div v-if="infoMessage" class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <p class="text-sm text-emerald-400">{{ infoMessage }}</p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading || !email || !code"
            class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ loading ? "Verifying..." : "Verify & Continue" }}</span>
          </button>
        </form>

        <!-- Resend Code -->
        <div class="mt-4 text-center">
          <button
            type="button"
            @click="handleResendCode"
            :disabled="resending || !email"
            class="text-sm text-gray-400 hover:text-emerald-400 disabled:text-gray-600 transition-colors"
          >
            {{ resending ? "Sending..." : "Didn't receive a code? Resend code" }}
          </button>
        </div>

        <!-- Divider -->
        <div class="flex items-center my-6">
          <div class="flex-1 border-t border-gray-700/50"></div>
          <span class="px-3 text-xs text-gray-500 uppercase">or</span>
          <div class="flex-1 border-t border-gray-700/50"></div>
        </div>

        <!-- Login Link -->
        <p class="text-center text-gray-400 text-sm">
          Back to
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
  title: "Verify Email - Serverless Uptime Monitor"
});

const route = useRoute();
const email = ref((route.query.email as string) || "");
const code = ref("");
const loading = ref(false);
const resending = ref(false);
const error = ref("");
const infoMessage = ref("");

const { confirmSignUp, resendConfirmationCode } = useAuth();

async function handleConfirm() {
  error.value = "";
  infoMessage.value = "";
  loading.value = true;

  try {
    const cleanEmail = email.value.trim();
    await confirmSignUp(cleanEmail, code.value.trim());
    await navigateTo("/login");
  } catch (err: any) {
    error.value = err.message || "Confirmation failed";
  } finally {
    loading.value = false;
  }
}

async function handleResendCode() {
  if (!email.value) return;

  error.value = "";
  infoMessage.value = "";
  resending.value = true;

  try {
    await resendConfirmationCode(email.value.trim());
    infoMessage.value = "Verification code resent successfully!";
  } catch (err: any) {
    error.value = err.message || "Failed to resend code";
  } finally {
    resending.value = false;
  }
}
</script>
