<script setup lang="ts">
import { DatePicker as VCalendarDatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import dayjs from "dayjs";
import type {DateRange, DateRangeFilter} from "~/types/date";

interface Range {
  label: string,
  duration: { type: string, value: string|number }
}

const dateRange = ref<DateRange|undefined>(undefined)

const emit = defineEmits<{ rangeUpdated: [DateRange | DateRangeFilter | undefined] }>()

const props = defineProps({
  seasonSelectors: {
    type: Boolean,
    default: true
  },
  dateRange: {
    type: Object as PropType<DateRange|DateRangeFilter|undefined>,
    default: undefined
  }
});

if (props.dateRange && typeof props.dateRange.label !== 'string') {
  dateRange.value = props.dateRange as DateRange
}

const columns = computed(() => {
  return isMobile().value ? 1 : 2
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

const ranges = [
  { label: '7 derniers jours', duration: { type: 'day', value: 7 } },
  { label: '14 derniers jours', duration: { type: 'day', value: 14 } },
  { label: '30 derniers jours', duration: { type: 'day', value: 30 } },
  { label: '3 derniers mois', duration: { type: 'month', value: 3 } },
  { label: '6 derniers mois', duration: { type: 'month', value: 6 } },
] as Range[]

if (props.seasonSelectors) {
  ranges.push({ label: 'Saison actuelle', duration: { type: 'filter', value: 'current-season' } })
  ranges.push({ label: 'Saison précédente', duration: { type: 'filter', value: 'previous-season' } })

} else {
  ranges.push({ label: 'Dernière année', duration: { type: 'year', value: 1 } })
}

function isRangeSelected(range: Range) {
  if (!props.dateRange) return false

  const isFilter = typeof range.duration.value === 'string';
  if (isFilter) {
    return typeof props.dateRange === 'object' && 'value' in props.dateRange && props.dateRange.value === range.duration.value;
  }

  return dayjs(props.dateRange.start).isSame(dayjs().subtract(range.duration.value, range.duration.type), 'day') && dayjs().isSame(props.dateRange.end, 'day')
}

function selectRange(range: Range) {
  const isFilter = typeof range.duration.value === 'string';
  if (isFilter) {
    // props.dateRange = { label: range.label, value: range.duration.value} as DateRangeFilter;
    dateRange.value = undefined;
    notify({ label: range.label, value: range.duration.value} as DateRangeFilter)
    return;
  }

  dateRange.value = { start: dayjs().subtract(range.duration.value, range.duration.type).toDate(), end: new Date() }
  notify({ start: dayjs().subtract(range.duration.value, range.duration.type).toDate(), end: new Date() } as DateRange)
}

function notify(range: DateRange|DateRangeFilter|undefined) {
  emit('rangeUpdated', range)
}
</script>

<template>
  <div class="flex items-center sm:divide-x divide-gray-200 dark:divide-gray-800">
    <div class="hidden sm:flex flex-col py-4">
      <UButton
          v-for="(range, index) in ranges"
          :key="index"
          :label="range.label"
          :color="isRangeSelected(range) ? 'primary' : 'neutral'"
          :variant="isRangeSelected(range) ? 'soft' : 'ghost'"
          class="rounded-none px-6"
          truncate
          @click="selectRange(range)"
      />
    </div>
    <VCalendarDatePicker v-model.range="dateRange" :columns="columns" v-bind="{ ...attrs, ...$attrs }" />
  </div>

</template>

<style>

</style>
