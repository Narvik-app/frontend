<script setup lang="ts">

const props = defineProps(
  {
    title: {
      type: String,
      required: true
    },
  }
)

const emit = defineEmits(['delete', 'close'])

</script>

<template>
  <ModalWithActions :title="props.title" @close="(state: boolean) => emit('close', state)">

    <UAlert
      class="my-4"
      color="error"
      variant="soft"
      title="La suppression d'une activité, supprimera aussi toutes les activités des membres liées."
      description="Il conseillé de faire un migration à la place."
    />

    <template #actions>
      <UButton
        color="error"
        @click="emit('delete'); emit('close', true)"
      >
        Valider la suppression
      </UButton>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">

</style>
