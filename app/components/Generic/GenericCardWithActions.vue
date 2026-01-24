<script setup lang="ts">

const props = defineProps({
  title: {
    type: String,
    required: false
  },
  spaced: {
    type: Boolean,
    default: true
  }
});

</script>

<template>
  <UCard>
    <div class="flex flex-col sm:flex-row flex-wrap gap-2 mb-2 justify-end">
      <slot name="title">
        <div v-if="props.title" class="text-xl font-bold">{{ props.title }}</div>
      </slot>
      <div v-if="spaced" class="flex-1"/>
      <slot name="actions"/>
    </div>
    <slot />
  </UCard>
</template>

<style scoped lang="css">

</style>
