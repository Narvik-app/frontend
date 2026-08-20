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
  },
  /** Forwarded to the trigger button, e.g. to color-code by status (error/warning/neutral). */
  color: {
    type: String,
    default: 'primary'
  },
  /** Forwarded to the trigger/clear buttons, e.g. "solid" (default) or "subtle" for a more discreet look. */
  variant: {
    type: String,
    default: 'solid'
  },
  /** Forwarded to the trigger/clear buttons, e.g. "xs" for a more compact field. */
  size: {
    type: String,
    default: undefined
  },
  /** Renders a plain, non-interactive button with the same label/color (no popover) — for read-only/auto-managed values. */
  disabled: {
    type: Boolean,
    default: false
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
    <UButton
      v-if="disabled"
      icon="i-heroicons-calendar-days-20-solid"
      :label="label"
      :color="color"
      :variant="variant"
      :size="size"
      disabled
    />
    <UPopover v-else v-model:open="popoverOpen">
      <UFieldGroup>
        <UButton icon="i-heroicons-calendar-days-20-solid" :label="label" :color="color" :variant="variant" :size="size" :loading="loading" />
        <UButton
          v-if="canBeClear && modelValue"
          icon="i-heroicons-x-mark"
          variant="soft"
          :size="size"
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
