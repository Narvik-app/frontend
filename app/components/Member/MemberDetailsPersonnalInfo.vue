<script setup lang="ts">

const props = defineProps({
  label: {
    type: String,
    required: false
  },
  icon: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: false
  }
});

</script>

<template>
  <div class="flex gap-2 items-center">
    <UIcon :name="props.icon" />

    <ULink v-if="props.to"
           :to="props.to"
           class="text-primary-500 hover:text-primary-600 hover:underline dark:text-primary-400 dark:hover:text-primary-500 underline-offset-4"
    >
      {{ props.label ?? 'Non défini' }}
    </ULink>
    <ULink v-else disabled>
      {{ props.label ?? 'Non défini' }}
    </ULink>
  </div>
</template>

<style scoped lang="css">

</style>
