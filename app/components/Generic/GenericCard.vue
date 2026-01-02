<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: false
  }
});

</script>

<template>
  <UCard>
    <div v-if="props.title" class="text-xl font-bold mb-2">{{ props.title }}</div>
    <slot />
  </UCard>
</template>

<style scoped lang="css">

</style>
