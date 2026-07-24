<script setup lang="ts">
import {formatDateReadable, formatDateTime} from '~/utils/date'

const props = defineProps({
  modelValue: {
    type: [Date, String] as PropType<Date | string | null>,
    default: null
  },
  /** 'date' (default) or 'dateTime' — forwarded to GenericDatePicker. */
  mode: {
    type: String,
    default: 'date'
  },
  placeholder: {
    type: String,
    default: 'Choisir une date'
  },
  /** Shows a clear (x) button, grouped with the trigger button, whenever a value is set. */
  canBeClear: {
    type: Boolean,
    default: false
  },
  /** Forwarded to the trigger button (e.g. while the current value is being fetched). */
  loading: {
    type: Boolean,
    default: false
  },
  /** Extra class forwarded to the inner GenericDatePicker/calendar (e.g. "!w-full"). */
  calendarClass: {
    type: String,
    default: undefined
  }
})

const emit = defineEmits(['update:modelValue'])

const popoverOpen = ref(false)

const label = computed(() => {
  if (!props.modelValue) return props.placeholder
  const iso = props.modelValue instanceof Date ? props.modelValue.toISOString() : props.modelValue
  const formatted = props.mode.toLowerCase() === 'date' ? formatDateReadable(iso) : formatDateTime(iso)
  return formatted ?? props.placeholder
})
</script>

<template>
    <UPopover v-model:open="popoverOpen">
      <UFieldGroup>
        <UButton icon="i-heroicons-calendar-days-20-solid" :label="label" :loading="loading" />
        <UButton
          v-if="canBeClear && modelValue"
          icon="i-heroicons-x-mark"
          variant="soft"
          @click="emit('update:modelValue', null)"
        />
      </UFieldGroup>

      <template #content>
        <div>
          <slot name="hint" />
          <GenericDatePicker
            :model-value="modelValue"
            :mode="mode"
            :class="calendarClass"
            @update:model-value="emit('update:modelValue', $event)"
            @close="popoverOpen = false"
          />
        </div>
      </template>
    </UPopover>
</template>
