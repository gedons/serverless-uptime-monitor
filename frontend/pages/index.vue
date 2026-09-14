<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-slate-400 font-medium">Loading UptimePulse Dashboard...</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
onMounted(() => {
  router.push("/dashboard");
});
</script>
