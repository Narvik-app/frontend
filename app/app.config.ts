export default defineAppConfig({
  toaster: {
    position: 'top-right' as const
  },

  // https://ui.nuxt.com/getting-started/theme#design-system
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
      // orange: 'orange',
      // red: 'red',
      // green: 'green',
      // yellow: 'yellow',
      // purple: 'purple'
    },

    button: {
      defaultVariants: {
        // Set default button color to neutral
        // color: 'neutral'
      },
      slots: {
        base: 'cursor-pointer'
      }
    },
    card: {
      defaultVariants: {
        variant: 'subtle'
      }
    },
    input: {
      slots: {
        root: 'w-full'
      }
    },
    inputMenu: {
      slots: {
        root: 'w-full'
      }
    },
    modal: {
      slots: {
        content: '!overflow-y-auto thin-scrollbar' // Fix for cards not scrolling when they have too much content...
      }
    },
    select: {
      slots: {
        base: 'w-full'
      }
    },
    selectMenu: {
      slots: {
        base: 'w-full'
      }
    },
    table: {
      slots: {
        td: 'py-2 text-(--ui-text)',
        tr: ' even:bg-(--table-even) dark:even:bg-(--table-even-dark)'
      }
    },
    textarea: {
      slots: {
        root: 'w-full'
      }
    },
  }
})
