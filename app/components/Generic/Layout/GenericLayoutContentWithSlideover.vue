<script setup lang="ts">
const isOpen = defineModel<boolean>({default: false})
</script>

<template>
  <div>
    <slot name="main"/>
    <USlideover v-model:open="isOpen">
      <template #content>
        <div class="flex flex-col h-full max-h-full">
          <UButton
            label="Fermer"
            block
            variant="soft"
            size="sm"
            class="sm:hidden rounded-none"
            @click="isOpen = false"
          />
          <div class="p-4 flex-1 overflow-y-auto">
            <slot name="side"/>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<style scoped lang="css">

</style>
