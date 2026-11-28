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
    },
    cancelText: {
      type: String,
      default: 'Annuler'
    },
    displayCancelButton: {
      type: Boolean,
      default: true
    }
  }
)
</script>

<template>
  <!-- The title is also given to UModal: with a custom #content it renders it as a visually hidden dialog title for screen readers -->
  <UModal :dismissible="props.dismissible" :title="props.title">
    <template #content>
      <div>
        <UCard>
          <div class="flex flex-col gap-4">
            <div class="text-xl font-bold text-center">{{ props.title }}</div>
            <slot/>

            <div class="flex gap-2 justify-between sm:justify-end flex-wrap">
              <slot v-if="props.displayCancelButton" name="cancel">
                <UButton color="neutral" variant="ghost" @click="emit('close', false)">
                  {{ props.cancelText }}
                </UButton>
              </slot>

              <slot name="actions"/>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UModal>
</template>

<style scoped lang="css">

</style>
