<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Monitors Manager</h1>
        <p class="text-slate-400 text-sm mt-1">Configure and manage all target URLs</p>
      </div>
      <NuxtLink to="/monitors/new" class="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
        + Add New Monitor
      </NuxtLink>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="relative w-full md:w-80">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by monitor name or URL..."
          class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3.5 py-2.5 pl-9 focus:outline-none focus:border-emerald-500"
        />
        <svg class="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div class="flex items-center space-x-3 w-full md:w-auto">
        <select
          v-model="statusFilter"
          class="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="UP">UP Only</option>
          <option value="DOWN">DOWN Only</option>
          <option value="PAUSED">PAUSED Only</option>
        </select>

        <button
          @click="loadMonitors"
          class="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700"
          title="Refresh monitors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Monitors List Table -->
    <div class="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
      <div v-if="loading" class="py-12 text-center">
        <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span class="text-sm text-slate-400">Loading monitor records...</span>
      </div>

      <div v-else-if="filteredMonitors.length === 0" class="py-12 text-center">
        <p class="text-slate-400 text-sm">No monitors match your filter criteria.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="text-xs uppercase text-slate-400 bg-slate-950/60 border-b border-slate-800 font-mono">
            <tr>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Name & URL</th>
              <th class="py-3 px-4">Method</th>
              <th class="py-3 px-4">Check Interval</th>
              <th class="py-3 px-4">Timeout</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr v-for="m in filteredMonitors" :key="m.monitorId" class="hover:bg-slate-800/40 transition-colors">
              <td class="py-4 px-4">
                <span
                  v-if="!m.enabled"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                >PAUSED</span>
                <span
                  v-else-if="m.status === 'UP'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >UP</span>
                <span
                  v-else-if="m.status === 'DOWN'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"
                >DOWN</span>
                <span
                  v-else
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700"
                >UNKNOWN</span>
              </td>
              <td class="py-4 px-4">
                <NuxtLink :to="`/monitors/${m.monitorId}`" class="font-semibold text-white hover:text-emerald-400 block">
                  {{ m.name }}
                </NuxtLink>
                <span class="text-xs font-mono text-slate-400 truncate block max-w-sm">{{ m.url }}</span>
              </td>
              <td class="py-4 px-4 font-mono text-xs text-slate-300 uppercase">
                {{ m.method || 'GET' }}
              </td>
              <td class="py-4 px-4 text-xs font-mono text-slate-300">
                {{ m.interval }} mins
              </td>
              <td class="py-4 px-4 text-xs font-mono text-slate-400">
                {{ m.timeout }}s
              </td>
              <td class="py-4 px-4 text-right space-x-2">
                <button
                  @click="toggleEnable(m)"
                  class="px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors"
                  :class="m.enabled ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'"
                >
                  {{ m.enabled ? 'Pause' : 'Resume' }}
                </button>
                <NuxtLink
                  :to="`/monitors/${m.monitorId}`"
                  class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  View
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
const searchQuery = ref("");
const statusFilter = ref("ALL");

const loadMonitors = async () => {
  loading.value = true;
  try {
    const res = await api.getMonitors();
    monitors.value = res.monitors || [];
  } catch (err) {
    console.error("Failed to load monitors:", err);
  } finally {
    loading.value = false;
  }
};

const toggleEnable = async (m) => {
  try {
    await api.updateMonitor(m.monitorId, { enabled: !m.enabled });
    await loadMonitors();
  } catch (err) {
    alert(err.message || "Failed to update monitor state");
  }
};

const filteredMonitors = computed(() => {
  return monitors.value.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      m.url.toLowerCase().includes(searchQuery.value.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter.value === "ALL") return true;
    if (statusFilter.value === "PAUSED") return !m.enabled;
    if (statusFilter.value === "UP") return m.enabled && m.status === "UP";
    if (statusFilter.value === "DOWN") return m.enabled && m.status === "DOWN";
    return true;
  });
});

onMounted(() => {
  loadMonitors();
});
</script>
