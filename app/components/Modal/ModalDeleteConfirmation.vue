<script setup lang="ts">

const props = defineProps(
  {
    title: {
      type: String,
      default: 'Êtes-vous certain ?'
    },

    description: {
      type: String,
      default: undefined
    },
    alertTitle: {
      type: String,
      default: undefined
    },
    alertDescription: {
      type: String,
      default: undefined
    },
    alertColor: {
      type: String,
      default: undefined
    },
    confirmLabel: {
      type: String,
      default: 'Supprimer'
    },
    confirmColor: {
      type: String,
      default: 'error'
    },
  }
)

// 2 ways binding
const isDeleting = defineModel<boolean>("is-deleting", { default: false, required: false })

const emit = defineEmits<{ delete: [boolean], close: [boolean] }>()

</script>

<template>
  <ModalWithActions :title="props.title" @close="(state: boolean) => emit('close', state)">

    <slot>
      <div>
        <UAlert
            v-if="alertTitle || alertDescription || alertColor"
            class="mb-4"
            variant="subtle"
            :color="alertColor"
            :title="alertTitle"
            :description="alertDescription"
        />
        <div>
          {{ props.description }}
        </div>
      </div>
    </slot>

    <template #actions>
      <UButton
        :loading="isDeleting"
        :color="confirmColor"
        @click="isDeleting = true; emit('delete', true)"
      >
        {{ confirmLabel }}
      </UButton>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">

</style>
