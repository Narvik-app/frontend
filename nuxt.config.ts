// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from './package.json'

export default defineNuxtConfig({
  devServer: {
    https: {
      key: './localhost-key.pem',
      cert: './localhost.pem'
    }
  },

  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2024-11-27',

  ssr: false,

  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-api-party',
    '@nuxtjs/turnstile',
    '@nuxtjs/seo',
  ],

  css: ['~/assets/css/main.css'],

  piniaPluginPersistedstate: {
    storage: 'localStorage',
    key: 'narvik_%id',
  },

  site: {
    name: 'Narvik',
  },

  app: {
    head: {
      titleTemplate: 'Narvik',
      link: [
        { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', type: 'image/svg+xml', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/manifest.json' },
      ]
    }
  },

  apiParty: {
    client: false, // Force server-side proxy even with SSR disabled
    endpoints: {
      localApi: {
        url: process.env.NUXT_API_PARTY_ENDPOINTS_LOCAL_API_URL || 'http://php',
      }
    }
  },

  runtimeConfig: {
    public: {
      clientVersion: pkg.version,
      clientId: '', // can be overridden by NUXT_PUBLIC_CLIENT_ID environment variable
      clientSecret: '', // can be overridden by NUXT_PUBLIC_CLIENT_SECRET environment variable

      badgerClientId: '', // can be overridden by NUXT_PUBLIC_BADGER_CLIENT_ID environment variable
      badgerClientSecret: '', // can be overridden by NUXT_PUBLIC_BADGER_CLIENT_SECRET environment variable

      clientTurnstile: false,

      umamiEnabled: false,// can be overridden by NUXT_PUBLIC_UMAMI_ENABLED environment variable
      umamiScript: '',// can be overridden by NUXT_PUBLIC_UMAMI_SCRIPT environment variable
      umamiWebsiteId: '',// can be overridden by NUXT_PUBLIC_UMAMI_WEBSITE_ID environment variable
    }
  },

  colorMode: {
    preference: 'light'
  },

  turnstile: {
    siteKey: '',
    addValidateEndpoint: false
  },

  // Require ssr, so we disable it
  ogImage: {
    enabled: false
  },
  schemaOrg: {
    enabled: false
  },

  robots: {
    disallow: ['*'],
    allow: ['/', '/login', '/login/**'],
  },
  sitemap: {
    include: ['/', '/login', '/login/**']
  }
})
