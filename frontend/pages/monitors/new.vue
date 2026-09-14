<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-center space-x-3">
      <NuxtLink to="/monitors" class="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors">
        ← Back
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Create New Monitor</h1>
        <p class="text-slate-400 text-sm mt-1">Configure automated health checks for your application</p>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
      <span>{{ error }}</span>
      <button @click="error = null" class="text-rose-400 hover:text-rose-200">✕</button>
    </div>

    <!-- Create Form Card -->
    <form @submit.prevent="submitForm" class="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl space-y-5">
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Monitor Name</label>
        <input
          v-model="form.name"
          type="text"
          required
          placeholder="e.g. Production API Gateway"
          class="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Target URL</label>
        <input
          v-model="form.url"
          type="url"
          required
          placeholder="https://api.example.com/health"
          class="w-full bg-slate-950 border border-slate-800 text-slate-100 font-mono text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
        />
        <p class="text-xs text-slate-500 mt-1.5">Only public HTTP/HTTPS URLs are supported. Private IP addresses and internal networks are blocked for security (SSRF protection).</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">HTTP Method</label>
          <select
            v-model="form.method"
            class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="GET">GET</option>
            <option value="HEAD">HEAD</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Check Interval</label>
          <select
            v-model.number="form.interval"
            class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
          >
            <option :value="1">Every 1 min</option>
            <option :value="5">Every 5 mins</option>
            <option :value="10">Every 10 mins</option>
            <option :value="15">Every 15 mins</option>
            <option :value="30">Every 30 mins</option>
            <option :value="60">Every 60 mins</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Timeout</label>
          <select
            v-model.number="form.timeout"
            class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
          >
            <option :value="5">5 Seconds</option>
            <option :value="10">10 Seconds</option>
            <option :value="15">15 Seconds</option>
            <option :value="30">30 Seconds</option>
          </select>
        </div>
      </div>

      <div class="pt-4 flex items-center justify-end space-x-3">
        <NuxtLink to="/monitors" class="px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700">
          Cancel
        </NuxtLink>
        <button
          type="submit"
          :disabled="submitting"
          class="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
        >
          <span v-if="submitting" class="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
          <span>{{ submitting ? 'Creating...' : 'Save & Start Monitoring' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";

const router = useRouter();
const api = useApi();

const form = ref({
  name: "",
  url: "",
  method: "GET",
  interval: 5,
  timeout: 10
});

const submitting = ref(false);
const error = ref(null);

const submitForm = async () => {
  submitting.value = true;
  error.value = null;

  try {
    const result = await api.createMonitor({
      name: form.value.name,
      url: form.value.url,
      method: form.value.method,
      interval: form.value.interval,
      timeout: form.value.timeout
    });

    if (result && result.monitor) {
      router.push(`/monitors/${result.monitor.monitorId}`);
    } else {
      router.push("/monitors");
    }
  } catch (err) {
    error.value = err.message || "Failed to create monitor";
  } finally {
    submitting.value = false;
  }
};
</script>
