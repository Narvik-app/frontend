<script setup lang="ts">

import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js'

import {Doughnut} from 'vue-chartjs'
import type {PropType} from "vue";

import type {setChartDefaultBackgroundColors} from "~/utils/chart";

ChartJS.register(Title, Tooltip, Legend, DoughnutController, ArcElement, CategoryScale, LinearScale)

const props = defineProps({
  data: {
    type: Object as PropType<ChartDoughnutData>,
    required: true
  },
  options: {
    type: Object,
    default: () => ({
      responsive: true,
      maintainAspectRatio: false,
    })
  }
});

</script>

<template>
  <Doughnut
    :data="setChartDefaultBackgroundColors(props.data, false)"
    :options="props.options"
  />
</template>

<style scoped lang="css">

</style>
