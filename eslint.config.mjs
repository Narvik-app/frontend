// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
  {
    rules: {
      // Vue 3 supports multiple template roots (fragments)
      'vue/no-multiple-template-root': 'off',
    }
  }
)
