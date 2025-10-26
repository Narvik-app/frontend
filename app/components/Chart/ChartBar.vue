<script setup lang="ts">

import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js'

import {Bar} from 'vue-chartjs'
import type {PropType} from "vue";
import type {ChartBarData} from "~/types/chart";

ChartJS.register(Title, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale)

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

const chartData = computed(() => {
  const data = props.data;

  // A good feature could be to get color from a custom palette

  for(let item of Object.keys(data.datasets)) {
    // Setting the default color
    if (data.datasets[item].backgroundColor === undefined ) {
      data.datasets[item].backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--ui-primary');
    }
  }
  return data
});

</script>

<template>
  <Bar
    :data="chartData"
    :options="props.options"
  />
</template>

<style scoped lang="css">

</style>
