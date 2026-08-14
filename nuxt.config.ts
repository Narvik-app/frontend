// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from './package.json'
import { defineLink } from '@unhead/vue'

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

  vite: {
    optimizeDeps: {
      include: [
        'uuid-encoder',
        'dayjs',
        'mergician',
        'clipboardy',
        'vue-qrcode-reader',
        'v-calendar',
        'chart.js',
        'vue-chartjs',
        '@tiptap/extension-text-align',
        '@tiptap/extension-text-style',
      ]
    }
  },

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
        defineLink({ rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' }),
        defineLink({ rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' }),
        defineLink({ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }),
        defineLink({ rel: 'apple-touch-icon', type: 'image/svg+xml', href: '/apple-touch-icon.png', sizes: '180x180' }),
        defineLink({ rel: 'manifest', href: '/manifest.json' }),
      ]
    }
  },

  // Three endpoints, all proxied server-side (client: false), so that OAuth client
  // credentials never reach the browser:
  // - localApi: used once the user holds a Bearer token. No client Authorization header
  //   here - the browser sends its own Bearer token, and mixing it with a static client
  //   Basic header would corrupt the request (see server/plugins/configure-api-party-auth.ts).
  // - localApiClientAuth: used for anonymous calls authenticated as the main OAuth client
  //   (login, register, reset-password, unauthenticated config fetch).
  // - badgerApi: used for badger kiosk calls. The badger OAuth client is public (no real
  //   secret - see narvik-back's install:oauth), so this header carries no secret either.
  apiParty: {
    client: false, // Force server-side proxy even with SSR disabled
    endpoints: {
      localApi: {
        url: process.env.NUXT_API_PARTY_ENDPOINTS_LOCAL_API_URL || 'http://php',
      },
      localApiClientAuth: {
        url: process.env.NUXT_API_PARTY_ENDPOINTS_LOCAL_API_URL || 'http://php',
      },
      badgerApi: {
        url: process.env.NUXT_API_PARTY_ENDPOINTS_LOCAL_API_URL || 'http://php',
      },
    }
  },

  runtimeConfig: {
    // Server-only: read by server/plugins/configure-api-party-auth.ts to build the
    // Authorization headers above. Never exposed to the browser (that's the point).
    oauthClientId: '', // can be overridden by NUXT_OAUTH_CLIENT_ID environment variable
    oauthClientSecret: '', // can be overridden by NUXT_OAUTH_CLIENT_SECRET environment variable
    oauthBadgerClientId: '', // can be overridden by NUXT_OAUTH_BADGER_CLIENT_ID environment variable

    public: {
      clientVersion: pkg.version,

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
