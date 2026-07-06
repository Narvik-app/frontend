<script setup lang="ts">
const props = defineProps({
  underline: {
    type: Boolean,
    default: false
  },
})

const border = computed(() => {
  if (props.underline) {
    return 'border-b-1 hover:border-b-2 border-primary-800'
  }

  return 'border-transparent'
})


</script>

<template>
  <ULink
    :class="'rounded-none transition text-primary-900 dark:text-primary-400 border-b-2 hover:text-primary-900 dark:hover:text-primary-400 hover:border-primary-800 dark:hover:border-primary-300 ' + border">
    <slot />
  </ULink>
</template>

<style scoped lang="css">

</style>
