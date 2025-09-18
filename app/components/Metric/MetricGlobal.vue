<script lang="ts" setup>
import MetricQuery from "~/composables/api/query/MetricQuery";
import type {Metric} from "~/types/api/item/metric";

import { Chart as ChartJS, Title, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale, Colors } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type {FetchItemData} from "~/types/api/api";
import {useSelfUserStore} from "~/stores/useSelfUser";

ChartJS.register(Title, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale, Colors)

const props = defineProps({
  superAdmin: {
    type: Boolean,
    required: false,
    default: false
  },
});

const selfStore = useSelfUserStore();
const { selectedProfile } = storeToRefs(selfStore)

const chartData: Ref<object|undefined> = ref(undefined)
const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: true,
})

const metricsQuery = new MetricQuery()

const memberMetrics: Ref<Metric | undefined> = ref(undefined);
const memberStats = computed(() => {
  let response = {
    loading: true,
    currentSeason: 0,
    previousSeason: 0,
    isIncreasing: false
  }
  if (memberMetrics.value) {
    response.loading = false;
    memberMetrics.value.childMetrics.forEach(childMetric => {
      if (childMetric.name == "current-season") response.currentSeason = childMetric.value;
      if (childMetric.name == "previous-season") response.previousSeason = childMetric.value;
    })
    response.isIncreasing = response.currentSeason >= response.previousSeason
  }
  return response
});

const presenceMetrics: Ref<Metric | undefined> = ref(undefined);
const presenceStats = computed(() => {
  let response = {
    loading: true,
    currentYear: 0,
    currentYearOpenedDays: 0,
    ratioPresenceOpenCurrentYear: 0,

    previousYear: 0,
    previousYearOpenedDays: 0,
    ratioPresenceOpenPreviousYear: 0,
  }

  if (presenceMetrics.value) {
    response.loading = false;
    presenceMetrics.value.childMetrics.forEach(childMetric => {
      if (childMetric.name == "current-season") {
        response.currentYear = childMetric.value;
        response.currentYearOpenedDays = childMetric.childMetrics[0].value;
        response.ratioPresenceOpenCurrentYear = response.currentYearOpenedDays === 0 ? 0 : (Math.round(response.currentYear/response.currentYearOpenedDays) || 0)
      }
      if (childMetric.name == "previous-season") {
        response.previousYear = childMetric.value;
        response.previousYearOpenedDays = childMetric.childMetrics[0].value;
        response.ratioPresenceOpenPreviousYear = response.previousYearOpenedDays === 0 ? 0 : (Math.round(response.previousYear/response.previousYearOpenedDays) || 0)
      }
    })
  }

  return response
});

const externalPresenceMetrics: Ref<Metric | undefined> = ref(undefined);
const externalPresenceStats = computed(() => {
  let response = {
    loading: true,
    currentYear: 0,
    ratioPresenceOpenCurrentYear: 0,

    previousYear: 0,
    ratioPresenceOpenPreviousYear: 0,
  }

  if (externalPresenceMetrics.value) {
    response.loading = false;
    externalPresenceMetrics.value.childMetrics.forEach(childMetric => {
      if (childMetric.name == "current-season") {
        response.currentYear = childMetric.value;
        response.ratioPresenceOpenCurrentYear = presenceStats.value.currentYearOpenedDays === 0 ? 0 : (Math.round(response.currentYear/presenceStats.value.currentYearOpenedDays) || 0)
      }
      if (childMetric.name == "previous-season") {
        response.previousYear = childMetric.value;
        response.ratioPresenceOpenPreviousYear = presenceStats.value.previousYearOpenedDays === 0 ? 0 : (Math.round(response.previousYear/presenceStats.value.previousYearOpenedDays) || 0)
      }
    })
  }

  return response
});

// We load the metrics
getMetrics()

function getMetrics() {
  if (props.superAdmin) {
    metricsQuery.getSuperAdmin("members").then(value => {
      memberMetrics.value = value.retrieved
    });

    metricsQuery.getSuperAdmin("presences").then(value => {
      presenceMetrics.value = value.retrieved
    });
    metricsQuery.getSuperAdmin("external-presences").then(value => {
      externalPresenceMetrics.value = value.retrieved
    });
    return
  }

  // We get metrics for a club

  metricsQuery.get("members").then(value => {
    memberMetrics.value = value.retrieved
  });

  // We get presences stats
  if (selectedProfile.value?.club.presencesEnabled) {
    metricsQuery.get("presences").then(value => {
      presenceMetrics.value = value.retrieved
    });
    metricsQuery.get("external-presences").then(value => {
      externalPresenceMetrics.value = value.retrieved
    });
    metricsQuery.get('activities').then(value => {
      parseGetActivities(value)
    });
  }

}

function parseGetActivities(value: FetchItemData<Metric>) {
  if (!value.retrieved || isNaN(value.retrieved.value)) return;

  let datasets: any[] = [];

  let newChartData = {
    datasets: [{ }],
  }

  value.retrieved.childMetrics.forEach(cm => {
    let data: object[] = [];
    cm.childMetrics.forEach(ccm => {
      data.push({
        x: ccm.name,
        y: ccm.value
      })
    })

    const dataset = {
      'label': cm.name === 'previous-season' ? 'Saison précédente' : 'Saison courante',
      'data': data
    }

    datasets.push(dataset)
  })

  newChartData.datasets = datasets
  chartData.value = newChartData
}

</script>

<template>
  <div>
    <div id="wrapper" class=" mx-auto">
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">

        <GenericStatCard
          title="Membres"
          tooltip="Cette saison"
          :value="memberStats.currentSeason"
          :is-increasing="memberStats.currentSeason >= memberStats.previousSeason"
          :top-right="{
              tooltip: 'Saison précédente',
              value: memberStats.previousSeason,
            }"
          :loading="memberStats.loading">
        </GenericStatCard>

        <template v-if="props.superAdmin || selectedProfile?.club.presencesEnabled">
          <GenericStatCard
            title="Jours ouverts"
            tooltip="Cette saison"
            :value="presenceStats.currentYearOpenedDays"
            :top-right="{
              value: presenceStats.previousYearOpenedDays,
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences (membres + externes)"
            tooltip="Cette saison"
            :value="presenceStats.currentYear + externalPresenceStats.currentYear"
            :top-right="{
              value: (presenceStats.previousYear + externalPresenceStats.previousYear),
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading && externalPresenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences/ouvertures (membres + externes)"
            tooltip="Cette saison"
            :value="'≃ ' + (presenceStats.ratioPresenceOpenCurrentYear + externalPresenceStats.ratioPresenceOpenCurrentYear)"
            :is-increasing="(presenceStats.ratioPresenceOpenCurrentYear + externalPresenceStats.ratioPresenceOpenCurrentYear) >= (presenceStats.ratioPresenceOpenPreviousYear + externalPresenceStats.ratioPresenceOpenPreviousYear)"
            :top-right="{
              value: (presenceStats.ratioPresenceOpenPreviousYear + externalPresenceStats.ratioPresenceOpenPreviousYear),
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences"
            tooltip="Cette saison"
            :value="presenceStats.currentYear"
            :top-right="{
              value: presenceStats.previousYear,
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences/ouvertures"
            tooltip="Cette saison"
            :value="'≃ ' + presenceStats.ratioPresenceOpenCurrentYear"
            :is-increasing="presenceStats.ratioPresenceOpenCurrentYear >= presenceStats.ratioPresenceOpenPreviousYear"
            :top-right="{
              value: presenceStats.ratioPresenceOpenPreviousYear,
              tooltip: 'Saison précédente'
            }"
            :loading="presenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences externes"
            tooltip="Cette saison"
            :value="externalPresenceStats.currentYear"
            :top-right="{
              value: externalPresenceStats.previousYear,
              tooltip: 'Saison précédente'
            }"
            :loading="externalPresenceStats.loading">
          </GenericStatCard>

          <GenericStatCard
            title="Présences externes/ouvertures"
            tooltip="Cette saison"
            :value="'≃ ' + externalPresenceStats.ratioPresenceOpenCurrentYear"
            :is-increasing="externalPresenceStats.ratioPresenceOpenCurrentYear >= externalPresenceStats.ratioPresenceOpenPreviousYear"
            :top-right="{
              value: externalPresenceStats.ratioPresenceOpenPreviousYear,
              tooltip: 'Saison précédente'
            }"
            :loading="externalPresenceStats.loading">
          </GenericStatCard>
        </template>
      </div>

      <GenericCard v-if="chartData && selectedProfile?.club.presencesEnabled" class="mt-4" title="Statistiques d'activités réalisées (membres)">
        <Bar
          :data="chartData"
          :options="chartOptions"
        />
      </GenericCard>
    </div>
  </div>
</template>
