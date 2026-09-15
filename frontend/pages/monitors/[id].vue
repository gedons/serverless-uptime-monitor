<template>
  <div class="space-y-6">
    <!-- Header Navigation -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <NuxtLink to="/monitors" class="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors">
          ← Back to Monitors
        </NuxtLink>
        <div class="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Polling (10s)</span>
        </div>
      </div>
      
      <div v-if="monitor" class="flex items-center space-x-3">
        <button
          @click="triggerCheck"
          :disabled="checking"
          class="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700 flex items-center space-x-2"
        >
          <svg :class="['w-4 h-4', checking ? 'animate-spin' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{{ checking ? 'Checking...' : 'Check Now' }}</span>
        </button>

        <button
          @click="toggleEnable"
          class="px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors"
          :class="monitor.enabled ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'"
        >
          {{ monitor.enabled ? 'Pause Monitor' : 'Resume Monitor' }}
        </button>

        <button
          @click="showDeleteModal = true"
          class="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center">
      <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-slate-400 text-sm">Loading monitor details and analytics...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
      {{ error }}
    </div>

    <!-- Details View -->
    <div v-else-if="monitor" class="space-y-6">
      <!-- Monitor Header Card -->
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center space-x-3">
            <h2 class="text-2xl font-bold text-white tracking-tight">{{ monitor.name }}</h2>
            <span class="px-2.5 py-1 text-xs font-mono font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">{{ monitor.method }}</span>
            <span
              v-if="!monitor.enabled"
              class="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"
            >PAUSED</span>
            <span
              v-else-if="monitor.status === 'UP'"
              class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center"
            ><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2"></span>UP</span>
            <span
              v-else-if="monitor.status === 'DOWN'"
              class="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center"
            ><span class="w-2 h-2 rounded-full bg-rose-400 animate-ping mr-2"></span>DOWN</span>
          </div>
          <p class="text-sm font-mono text-slate-400">{{ monitor.url }}</p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span class="text-slate-500 block">Check Interval</span>
            <span class="text-white font-bold text-sm">{{ monitor.interval }} min</span>
          </div>
          <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span class="text-slate-500 block">Timeout</span>
            <span class="text-white font-bold text-sm">{{ monitor.timeout }} sec</span>
          </div>
          <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
            <span class="text-slate-500 block">Next Scheduled</span>
            <span class="text-slate-300 font-bold text-sm">{{ formatDate(monitor.nextCheckAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div v-if="stats" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-xs font-semibold uppercase text-slate-400">Uptime %</span>
          <div class="text-2xl font-extrabold text-emerald-400 mt-1">{{ stats.uptimePercentage }}%</div>
        </div>
        <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-xs font-semibold uppercase text-slate-400">Avg Response Time</span>
          <div class="text-2xl font-extrabold text-white mt-1">{{ stats.averageResponseTime }} ms</div>
        </div>
        <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-xs font-semibold uppercase text-slate-400">Fastest / Slowest</span>
          <div class="text-sm font-bold text-slate-300 mt-2 font-mono">{{ stats.fastestResponseTime }}ms / {{ stats.slowestResponseTime }}ms</div>
        </div>
        <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-xs font-semibold uppercase text-slate-400">Total Incidents</span>
          <div class="text-2xl font-extrabold text-amber-400 mt-1">{{ stats.totalIncidents }}</div>
        </div>
      </div>

      <!-- Analytics & Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Latency Line Chart -->
        <div class="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-300">Response Time History (ms)</h3>
            <span class="text-xs text-slate-500 font-mono">Last 50 checks</span>
          </div>
          <div class="h-64">
            <ClientOnly>
              <Line v-if="lineChartData.labels.length" :data="lineChartData" :options="lineChartOptions" />
              <div v-else class="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                No latency history recorded yet
              </div>
            </ClientOnly>
          </div>
        </div>

        <!-- Uptime Doughnut Chart -->
        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl space-y-4 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-300">Uptime Ratio</h3>
            <span class="text-xs font-mono font-bold text-emerald-400" v-if="stats">{{ stats.uptimePercentage }}%</span>
          </div>
          <div class="h-52 relative flex items-center justify-center">
            <ClientOnly>
              <Doughnut v-if="doughnutChartData.datasets[0].data.some(v => v > 0)" :data="doughnutChartData" :options="doughnutChartOptions" />
              <div v-else class="text-slate-500 text-xs font-mono">No uptime statistics</div>
            </ClientOnly>
          </div>
          <div class="flex justify-center space-x-6 text-xs font-mono">
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span class="text-slate-300">UP</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-rose-500"></span>
              <span class="text-slate-300">DOWN</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Check History & Incidents Tabs -->
      <div class="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div class="flex items-center space-x-6 border-b border-slate-800 pb-3">
          <button
            @click="activeTab = 'history'"
            :class="['text-sm font-semibold pb-1 border-b-2 transition-colors', activeTab === 'history' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200']"
          >
            Check History
          </button>
          <button
            @click="activeTab = 'incidents'"
            :class="['text-sm font-semibold pb-1 border-b-2 transition-colors', activeTab === 'incidents' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200']"
          >
            Incidents Timeline ({{ incidents.length }})
          </button>
        </div>

        <!-- History Tab Content -->
        <div v-if="activeTab === 'history'" class="space-y-4">
          <div v-if="historyItems.length === 0" class="py-8 text-center text-slate-400 text-sm">
            No check results recorded yet.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono text-slate-300">
              <thead class="uppercase text-slate-500 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th class="py-2.5 px-3">Status</th>
                  <th class="py-2.5 px-3">HTTP Code</th>
                  <th class="py-2.5 px-3">Latency</th>
                  <th class="py-2.5 px-3">Checked At</th>
                  <th class="py-2.5 px-3">Error / Note</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr v-for="c in historyItems" :key="c.checkId" class="hover:bg-slate-800/40">
                  <td class="py-3 px-3">
                    <span :class="c.status === 'UP' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'">
                      {{ c.status }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-slate-200 font-bold">{{ c.httpStatus || 'N/A' }}</td>
                  <td class="py-3 px-3 text-slate-300">{{ c.responseTime !== undefined ? c.responseTime + ' ms' : '-' }}</td>
                  <td class="py-3 px-3 text-slate-400">{{ formatDate(c.checkedAt) }}</td>
                  <td class="py-3 px-3 text-rose-400 truncate max-w-xs">{{ c.error || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Incidents Tab Content -->
        <div v-if="activeTab === 'incidents'" class="space-y-4">
          <div v-if="incidents.length === 0" class="py-8 text-center text-slate-400 text-sm">
            🎉 No incidents recorded. Service running smoothly.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="inc in incidents"
              :key="inc.incidentId"
              class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between gap-3 text-xs"
            >
              <div>
                <div class="flex items-center space-x-2">
                  <span :class="inc.status === 'OPEN' ? 'px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold' : 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold'">
                    {{ inc.status }}
                  </span>
                  <span class="text-white font-semibold text-sm">Started {{ formatDate(inc.startedAt) }}</span>
                </div>
                <p v-if="inc.cause" class="text-slate-400 mt-1 font-mono">Cause: {{ inc.cause }}</p>
              </div>

              <div class="text-right font-mono text-slate-400">
                <div v-if="inc.resolvedAt">Resolved: {{ formatDate(inc.resolvedAt) }}</div>
                <div v-if="inc.durationSeconds">Outage: {{ Math.floor(inc.durationSeconds / 60) }}m {{ inc.durationSeconds % 60 }}s</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <h3 class="text-lg font-bold text-white">Delete Monitor?</h3>
        <p class="text-sm text-slate-400">Are you sure you want to delete <span class="text-white font-semibold">{{ monitor?.name }}</span>? This operation cannot be undone.</p>
        <div class="flex items-center justify-end space-x-3 pt-2">
          <button @click="showDeleteModal = false" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          <button @click="confirmDelete" :disabled="deleting" class="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-500 text-white hover:bg-rose-600">
            {{ deleting ? 'Deleting...' : 'Delete Permanently' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";
import { Line, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  ArcElement
} from "chart.js";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  ArcElement
);

const route = useRoute();
const router = useRouter();
const api = useApi();

const monitorId = route.params.id;
const monitor = ref(null);
const stats = ref(null);
const historyItems = ref([]);
const incidents = ref([]);
const loading = ref(true);
const checking = ref(false);
const deleting = ref(false);
const error = ref(null);
const activeTab = ref("history");
const showDeleteModal = ref(false);

let pollInterval = null;

const loadData = async (isSilent = false) => {
  if (!isSilent) loading.value = true;
  error.value = null;

  try {
    const [monRes, statsRes, histRes, incRes] = await Promise.allSettled([
      api.getMonitor(monitorId),
      api.getStats(monitorId),
      api.getHistory(monitorId),
      api.getIncidents(monitorId)
    ]);

    if (monRes.status === "fulfilled") {
      monitor.value = monRes.value.monitor;
    } else if (!isSilent) {
      error.value = "Monitor not found";
      return;
    }

    if (statsRes.status === "fulfilled") stats.value = statsRes.value;
    if (histRes.status === "fulfilled") historyItems.value = histRes.value.items || [];
    if (incRes.status === "fulfilled") incidents.value = incRes.value.incidents || [];
  } catch (err) {
    if (!isSilent) error.value = err.message || "Failed to load monitor details";
  } finally {
    if (!isSilent) loading.value = false;
  }
};

// Response Time Line Chart Data
const lineChartData = computed(() => {
  const reversed = [...historyItems.value].reverse();
  return {
    labels: reversed.map((c) => {
      const date = new Date(c.checkedAt);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }),
    datasets: [
      {
        label: "Response Time (ms)",
        data: reversed.map((c) => (c.status === "UP" ? c.responseTime ?? 0 : null)),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: reversed.map((c) => (c.status === "UP" ? "#10b981" : "#f43f5e")),
        spanGaps: false
      }
    ]
  };
});

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.parsed.y !== null ? ctx.parsed.y + ' ms' : 'DOWN'}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: "#1e293b" },
      ticks: { color: "#64748b", font: { size: 10 } }
    },
    y: {
      grid: { color: "#1e293b" },
      ticks: { color: "#64748b", font: { size: 10 } },
      beginAtZero: true
    }
  }
};

// Uptime Doughnut Chart Data
const doughnutChartData = computed(() => {
  const up = historyItems.value.filter((c) => c.status === "UP").length;
  const down = historyItems.value.filter((c) => c.status === "DOWN").length;
  return {
    labels: ["UP", "DOWN"],
    datasets: [
      {
        data: [up, down],
        backgroundColor: ["#10b981", "#f43f5e"],
        borderWidth: 0
      }
    ]
  };
});

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  cutout: "75%"
};

const triggerCheck = async () => {
  checking.value = true;
  try {
    await api.triggerCheck(monitorId);
    await loadData(true);
  } catch (err) {
    alert(err.message || "Check failed");
  } finally {
    checking.value = false;
  }
};

const toggleEnable = async () => {
  try {
    await api.updateMonitor(monitorId, { enabled: !monitor.value.enabled });
    await loadData(true);
  } catch (err) {
    alert(err.message || "Failed to update monitor state");
  }
};

const confirmDelete = async () => {
  deleting.value = true;
  try {
    await api.deleteMonitor(monitorId);
    router.push("/monitors");
  } catch (err) {
    alert(err.message || "Failed to delete monitor");
    deleting.value = false;
  }
};

const formatDate = (iso) => {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

onMounted(() => {
  loadData();
  // 10 second live polling
  pollInterval = setInterval(() => {
    loadData(true);
  }, 10000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>
