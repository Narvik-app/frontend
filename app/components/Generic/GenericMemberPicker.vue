<script setup lang="ts">
import type {PropType} from 'vue'
import type {Member} from '~/types/api/item/clubDependent/member'
import SearchMember from '~/components/Member/SearchMember.vue'
import {getMemberDisplayName} from '~/utils/string'

const props = defineProps({
  modelValue: {
    type: Object as PropType<Member | undefined>,
    required: false,
    default: undefined,
  },
  label: {
    type: String,
    required: false,
    default: undefined,
  },
})

const emit = defineEmits<{ 'update:modelValue': [Member | undefined] }>()
</script>

<template>
  <div>
    <div v-if="props.label" class="text-sm font-medium mb-1">{{ props.label }}</div>
    <SearchMember v-if="!props.modelValue" compact @selected-member="(m: Member) => emit('update:modelValue', m)" />
    <div v-else class="text-sm font-medium text-primary flex items-center gap-1">
      <UButton
        block
        variant="soft"
        trailing-icon="i-heroicons-x-mark"
        @click="emit('update:modelValue', undefined)"
      >
        {{ getMemberDisplayName(props.modelValue) }}
      </UButton>
    </div>
  </div>
</template>
