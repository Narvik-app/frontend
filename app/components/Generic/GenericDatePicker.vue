<script setup lang="ts">
import {DatePicker as VCalendarDatePicker} from 'v-calendar'
import 'v-calendar/style.css'

const props = defineProps({
    modelValue: {
      type: [Date, Object] as PropType<object | null>,
      default: null
    },
    /** 'date' (default) auto-closes on selection; 'dateTime'/'time' need the time adjusted too, so they wait for an explicit close. */
    mode: {
      type: String,
      default: 'date'
    }
  })

  const emit = defineEmits(['update:model-value', 'close'])

  const needsManualClose = computed(() => props.mode.toLowerCase() !== 'date')

  const date = computed({
    get: () => props.modelValue,
    set: (value) => {
      emit('update:model-value', value)
      if (!needsManualClose.value) {
        emit('close')
      }
    }
  })

  const attrs = {
    transparent: true,
    borderless: true,
    color: 'nk',
    'is-dark': { selector: 'html', darkClass: 'dark' },
    'first-day-of-week': 2,
    mode: props.mode,
    attributes: [
      {
        key: 'today',
        dot: {
          style: {
            marginBottom: '2px'
          }
        },
        dates: new Date(),
      }
    ]
  }
</script>

<template>
  <div>
    <VCalendarDatePicker v-model="date" v-bind="{ ...attrs, ...$attrs }" is24hr />
    <div v-if="needsManualClose" class="flex justify-end p-2 pt-0">
      <UButton label="Valider" size="sm" @click="emit('close')" />
    </div>
  </div>
</template>

<style>

</style>
