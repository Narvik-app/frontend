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
  <GenericLayoutContentWithStickySide>
    <template #main>
      <UCard>
        <template #header>
          <div class="text-xl font-bold">Rédiger un email</div>
        </template>

        <TextEditor
          :model-value="modelValue"
          @update:model-value="modelValue = $event"
        />
      </UCard>
    </template>

    <template #side>
      
    </template>
  </GenericLayoutContentWithStickySide>
</template>