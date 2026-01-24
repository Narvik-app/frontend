<script setup lang="ts">

import {BarController, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip} from 'chart.js'

import {Bar} from 'vue-chartjs'
import type {PropType} from "vue";

import type {ChartBarData, setChartDefaultBackgroundColors} from "~/utils/chart";

ChartJS.register(Title, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  data: {
    type: Object as PropType<ChartBarData>,
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
  <Bar
    :data="setChartDefaultBackgroundColors(props.data)"
    :options="props.options"
  />
</template>

<style scoped lang="css">

</style>
