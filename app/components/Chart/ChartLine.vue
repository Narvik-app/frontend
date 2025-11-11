<script setup lang="ts">

import {
  Chart as ChartJS,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LinearScale
} from 'chart.js'
import { Line } from 'vue-chartjs'
import type {PropType} from "vue";

import type {ChartLineData, setChartDefaultBackgroundColors} from "~/utils/chart";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const props = defineProps({
  data: {
    type: Object as PropType<ChartLineData>,
    required: true
  },
  options: {
    type: Object,
    default: {
      responsive: true,
      maintainAspectRatio: false,
    }
  }
});

</script>

<template>
  <Line
    :data="setChartDefaultBackgroundColors(props.data, true, 'borderColor')"
    :options="props.options"
  />
</template>

<style scoped lang="css">

</style>
