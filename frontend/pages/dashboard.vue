<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Overview Dashboard</h1>
        <p class="text-slate-400 text-sm mt-1">Real-time health status of your endpoints</p>
      </div>
      <div class="flex items-center space-x-3">
        <button
          @click="loadMonitors"
          :disabled="loading"
          class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700 flex items-center space-x-2"
        >
          <svg :class="['w-4 h-4', loading ? 'animate-spin' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
        <NuxtLink to="/monitors/new" class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
          + Add Monitor
        </NuxtLink>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
      <span>{{ error }}</span>
      <button @click="error = null" class="text-rose-400 hover:text-rose-200">✕</button>
    </div>

    <!-- Metrics Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Monitors</span>
        <div class="text-3xl font-extrabold text-white mt-2">{{ monitors.length }}</div>
        <p class="text-xs text-slate-500 mt-1 font-mono">Monitored endpoints</p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl">
        <span class="text-xs font-semibold uppercase tracking-wider text-emerald-400">Services Up</span>
        <div class="text-3xl font-extrabold text-emerald-400 mt-2">{{ upCount }}</div>
        <p class="text-xs text-slate-500 mt-1 font-mono">{{ upPercentage }}% of active services</p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl">
        <span class="text-xs font-semibold uppercase tracking-wider text-rose-400">Services Down</span>
        <div class="text-3xl font-extrabold text-rose-400 mt-2">{{ downCount }}</div>
        <p class="text-xs text-slate-500 mt-1 font-mono">Requires attention</p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl">
        <span class="text-xs font-semibold uppercase tracking-wider text-amber-400">Paused</span>
        <div class="text-3xl font-extrabold text-amber-400 mt-2">{{ pausedCount }}</div>
        <p class="text-xs text-slate-500 mt-1 font-mono">Monitoring disabled</p>
      </div>
    </div>

    <!-- Monitor List Section -->
    <div class="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-white tracking-tight">Active Monitors</h2>
        <span class="text-xs font-mono text-slate-400">Auto-checking via AWS EventBridge</span>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && monitors.length === 0" class="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
        <svg class="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 class="text-base font-semibold text-white">No monitors created yet</h3>
        <p class="text-slate-400 text-sm mt-1 max-w-sm mx-auto">Create your first monitor to track uptime, response time, and receive alerts on outages.</p>
        <NuxtLink to="/monitors/new" class="inline-block mt-4 px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
          + Create First Monitor
        </NuxtLink>
      </div>

      <!-- Loading Spinner -->
      <div v-else-if="loading && monitors.length === 0" class="py-12 text-center">
        <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span class="text-sm text-slate-400">Fetching monitors from API...</span>
      </div>

      <!-- Table View -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="text-xs uppercase text-slate-400 bg-slate-950/60 border-b border-slate-800 font-mono">
            <tr>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Monitor Name</th>
              <th class="py-3 px-4">URL</th>
              <th class="py-3 px-4">Interval</th>
              <th class="py-3 px-4">Next Check</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr v-for="m in monitors" :key="m.monitorId" class="hover:bg-slate-800/40 transition-colors">
              <td class="py-4 px-4">
                <span
                  v-if="!m.enabled"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                >
                  PAUSED
                </span>
                <span
                  v-else-if="m.status === 'UP'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                  UP
                </span>
                <span
                  v-else-if="m.status === 'DOWN'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping mr-1.5"></span>
                  DOWN
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700"
                >
                  UNKNOWN
                </span>
              </td>
              <td class="py-4 px-4 font-semibold text-white">
                <NuxtLink :to="`/monitors/${m.monitorId}`" class="hover:text-emerald-400 transition-colors">
                  {{ m.name }}
                </NuxtLink>
              </td>
              <td class="py-4 px-4 font-mono text-xs text-slate-400 truncate max-w-xs">
                {{ m.url }}
              </td>
              <td class="py-4 px-4 text-xs font-mono text-slate-300">
                Every {{ m.interval }}m
              </td>
              <td class="py-4 px-4 text-xs text-slate-400">
                {{ formatDate(m.nextCheckAt) }}
              </td>
              <td class="py-4 px-4 text-right space-x-2">
                <button
                  @click="runCheck(m.monitorId)"
                  :disabled="checkingIds.has(m.monitorId)"
                  class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  {{ checkingIds.has(m.monitorId) ? 'Checking...' : 'Check Now' }}
                </button>
                <NuxtLink
                  :to="`/monitors/${m.monitorId}`"
                  class="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                >
                  Details
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useApi } from "~/composables/useApi";

const api = useApi();
const monitors = ref([]);
const loading = ref(true);
const error = ref(null);
const checkingIds = ref(new Set());

const upCount = computed(() => monitors.value.filter((m) => m.enabled && m.status === "UP").length);
const downCount = computed(() => monitors.value.filter((m) => m.enabled && m.status === "DOWN").length);
const pausedCount = computed(() => monitors.value.filter((m) => !m.enabled).length);

const upPercentage = computed(() => {
  const active = monitors.value.filter((m) => m.enabled).length;
  if (active === 0) return 100;
  return Math.round((upCount.value / active) * 100);
});

const loadMonitors = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.getMonitors();
    monitors.value = res.monitors || [];
  } catch (err) {
    error.value = err.message || "Failed to load monitors";
  } finally {
    loading.value = false;
  }
};

const runCheck = async (id) => {
  checkingIds.value.add(id);
  try {
    await api.triggerCheck(id);
    await loadMonitors();
  } catch (err) {
    error.value = err.message || "Manual check failed";
  } finally {
    checkingIds.value.delete(id);
  }
};

const formatDate = (iso) => {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

onMounted(() => {
  loadMonitors();
});
</script>
