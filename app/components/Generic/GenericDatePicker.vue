<script setup lang="ts">
import {DatePicker as VCalendarDatePicker} from 'v-calendar'
import 'v-calendar/style.css'

const props = defineProps({
    modelValue: {
      type: [Date, Object] as PropType<object | null>,
      default: null
    }
  })

  const emit = defineEmits(['update:model-value', 'close'])

  const date = computed({
    get: () => props.modelValue,
    set: (value) => {
      emit('update:model-value', value)
      emit('close')
    }
  })

  const attrs = {
    transparent: true,
    borderless: true,
    color: 'nk',
    'is-dark': { selector: 'html', darkClass: 'dark' },
    'first-day-of-week': 2,
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
  <VCalendarDatePicker v-model="date" v-bind="{ ...attrs, ...$attrs }" is24hr />
</template>

<style>

</style>
