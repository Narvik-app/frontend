<script setup lang="ts">
  import type { PropType } from 'vue';
  import type { Email } from '~/types/api/item/clubDependent/plugin/emailing/email';

  const props = defineProps({
    item: {
      type: Object as PropType<Email>,
      required: true
    }
  })

  const emit = defineEmits(['close'])

  const email = ref(props.item)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-row gap-4">
        <UButton
          @click="emit('close')"
          icon="i-heroicons-x-circle"
          color="neutral"
          variant="outline"
          size="xs"
        />
  
        <div class="text-xl font-bold">{{ email.title }}</div>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <div>
        <p>Expéditeur: {{ email.sender }}</p>
        <p>Date: {{ formatDateTimeReadable(email.createdAt) }}</p>
      </div>
      <UCard>
        <div v-html="email.content" class="email-preview"></div>
      </UCard>
      <p>Envoyé à {{ email.recipientCount }} {{ email.recipientCount > 1 ? 'membres' : 'membre' }} {{ email.isNewsletter ? '(newsletter)' : '' }}</p>
    </div>
  </UCard>
</template>

<style scoped>
:deep(.email-preview ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
}

:deep(.email-preview ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
}

:deep(.email-preview li) {
  margin-bottom: 0.25rem;
}

:deep(.email-preview a) {
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
}

:deep(.email-preview a:hover) {
  text-decoration: underline dotted;
}

:deep(.email-preview h1) {
	font-size: 2rem;
	font-weight: bold;
	margin-bottom: 0.5rem;
}

:deep(.email-preview h2) {
	font-size: 1.5rem;
	font-weight: bold;
	margin-bottom: 0.4rem;
}

:deep(.email-preview h3) {
	font-size: 1.2rem;
	font-weight: bold;
	margin-bottom: 0.3rem;
}
</style>