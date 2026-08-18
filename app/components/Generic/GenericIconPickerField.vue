<script setup lang="ts">
defineProps({
  modelValue: {
    type: String as PropType<string | undefined>,
    default: undefined
  },
  label: {
    type: String,
    default: 'Icône'
  },
  name: {
    type: String,
    default: 'icon'
  },
  placeholder: {
    type: String,
    default: undefined
  }
})

const emit = defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <UFormField :label="label" :name="name">
    <template #description>
      <ContentLink variant="link" to="https://heroicons.com/" target="_blank">Liste des icônes Heroicons</ContentLink>
      <slot name="hint" />
    </template>

    <template v-if="modelValue" #hint>
      <UIcon :name="'i-heroicons-' + modelValue" />
    </template>

    <UInput
      :model-value="modelValue"
      :placeholder="placeholder"
      @update:model-value="(value) => emit('update:modelValue', value as string)"
    />
  </UFormField>
</template>

<style scoped lang="css">

</style>
