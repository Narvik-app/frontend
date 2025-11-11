<script setup lang="ts">
  import { isDarkMode } from "~/utils/browser";

  const isDark = isDarkMode()

</script>

<template>
  <div>
    <UFieldGroup orientation="horizontal" size="sm">
      <UButton
        icon="i-heroicons-sun-20-solid"
        :variant="!isDark ? 'solid': 'outline'"
        @click="isDark = false"
      >
        Clair
      </UButton>
      <UButton
        icon="i-heroicons-moon-20-solid"
        :variant="isDark ? 'solid': 'outline'"
        @click="isDark = true"
      >
        Sombre
      </UButton>
    </UFieldGroup>


  </div>
</template>

<style scoped lang="css">

</style>
