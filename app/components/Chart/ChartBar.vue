<script setup lang="ts">

import {
  Chart as ChartJS, Title, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale, Colors,
  type ChartData as ChartJsData
} from 'chart.js'

import { Bar } from 'vue-chartjs'
import type {PropType} from "vue";

ChartJS.register(Title, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale, Colors)

export interface ChartBarData extends ChartJsData<'bar'> {}

const props = defineProps({
  data: {
    type: Object as PropType<ChartBarData>,
    required: true
  },
  options: {
    type: Object,
    default: {
      responsive: true,
      maintainAspectRatio: true,
    }
  }
});


</script>

<template>
  <Bar
    :data="props.data"
    :options="props.options"
  />
</template>

<style scoped lang="css">

</style>
