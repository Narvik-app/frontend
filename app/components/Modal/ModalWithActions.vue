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
  <UModal :dismissible="props.dismissible">
    <template #content>
      <div>
        <UCard>
          <div class="flex flex-col gap-4">
            <div class="text-xl font-bold text-center">{{ props.title }}</div>
            <slot/>

            <div class="flex gap-2 justify-between sm:justify-end flex-wrap">
              <slot name="cancel" v-if="props.displayCancelButton">
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
