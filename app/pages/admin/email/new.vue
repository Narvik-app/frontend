<script lang="ts" setup>
  import TextEditor from '~/components/TextEditor.vue';

  definePageMeta({
    layout: "email"
  })

  useHead({
    title: 'Nouveau mail'
  })

  const modelValue = ref('')

  watch(modelValue, () => {
    console.log(modelValue.value)
  })
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-6 gap-4">
    <div class="lg:col-span-4">
      <UCard>
        <template #header>
          <div class="text-xl font-bold">Rédiger un email</div>
        </template>

        <TextEditor
          :model-value="modelValue"
          @update:model-value="modelValue = $event"
        />
      </UCard>
    </div>
  </div>
</template>