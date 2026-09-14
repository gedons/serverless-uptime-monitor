// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss"],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3000",
      awsRegion: process.env.NUXT_PUBLIC_AWS_REGION || "eu-west-1",
      cognitoUserPoolId: process.env.NUXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      cognitoClientId: process.env.NUXT_PUBLIC_COGNITO_CLIENT_ID || ""
    }
  },
  app: {
    head: {
      title: "Serverless Uptime Monitor",
      meta: [
        { name: "description", content: "Production-ready Serverless Uptime Monitoring SaaS Platform" }
      ],
      link: [
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" }
      ]
    }
  }
});
