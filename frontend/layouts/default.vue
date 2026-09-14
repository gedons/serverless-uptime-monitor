<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
    <!-- Sidebar Navigation -->
    <aside class="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex-shrink-0">
      <div class="p-6 flex items-center justify-between">
        <NuxtLink to="/dashboard" class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg class="w-5 h-5 text-slate-950 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span class="font-bold text-lg tracking-tight text-white block leading-none">UptimePulse</span>
            <span class="text-[10px] text-emerald-400 font-mono tracking-wider uppercase font-semibold">Serverless SaaS</span>
          </div>
        </NuxtLink>
        
        <button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden text-slate-400 hover:text-white p-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <nav :class="['px-4 pb-6 space-y-1', mobileMenuOpen ? 'block' : 'hidden md:block']">
        <NuxtLink
          to="/dashboard"
          class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors"
          :class="$route.path === '/dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Dashboard
        </NuxtLink>

        <NuxtLink
          to="/monitors"
          class="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors"
          :class="$route.path.startsWith('/monitors') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Monitors
        </NuxtLink>
      </nav>

      <!-- User Profile & Logout section in sidebar footer -->
      <div v-if="user" class="p-4 mx-4 mt-auto border-t border-slate-800/80 hidden md:block">
        <div class="flex items-center justify-between">
          <div class="min-w-0 pr-2">
            <p class="text-xs font-medium text-slate-300 truncate" :title="user.email">{{ user.email }}</p>
            <p class="text-[10px] text-emerald-400 font-mono">Authenticated</p>
          </div>
          <button
            @click="signOut"
            title="Sign out"
            class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header class="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
        <h1 class="text-sm font-medium text-slate-400">
          Status: <span class="inline-flex items-center text-emerald-400 font-semibold ml-1"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2"></span>All Systems Operational</span>
        </h1>
        <div class="flex items-center gap-3">
          <NuxtLink to="/monitors/new" class="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
            + Add Monitor
          </NuxtLink>
          <button
            @click="signOut"
            class="md:hidden inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main class="flex-1 p-6 md:p-8 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
const mobileMenuOpen = ref(false);
const { user, signOut } = useAuth();
</script>
