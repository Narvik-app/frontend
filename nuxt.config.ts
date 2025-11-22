// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from './package.json'

export default defineNuxtConfig({
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2024-11-27',

  ssr: true,

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
    },

    apiParty: {
      endpoints: {
        localApi: {
          url: 'http://php',
        }
      }
    }
  },

  colorMode: {
    preference: 'light'
  },

  turnstile: {
    siteKey: '',
    addValidateEndpoint: false
  },

  // These features are disabled as they're not needed for this application
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