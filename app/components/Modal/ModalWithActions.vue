<script setup lang="ts">
const emit = defineEmits<{ close: [boolean] }>()

const props = defineProps(
  {
    title: {
      type: String,
      default: undefined
    },
    dismissible: {
      type: Boolean,
      default: true
    }
  }
)
</script>

<template>
  <UModal :dismissible="props.dismissible">
    <template #content>
      <UCard>
        <div class="flex flex-col gap-4">
          <div class="text-xl font-bold text-center">{{ props.title }}</div>
          <slot></slot>

          <div class="flex gap-2 justify-between sm:justify-end flex-wrap">
            <slot name="cancel">
              <UButton color="neutral" variant="ghost" @click="emit('close', false)">
                Annuler
              </UButton>
            </slot>

            <slot name="actions"></slot>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<style scoped lang="css">

</style>
