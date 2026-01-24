<script setup lang="ts">

import ActivityQuery from "~/composables/api/query/clubDependent/plugin/presence/ActivityQuery";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import {useSelfUserStore} from "~/stores/useSelfUser";
import type {WriteClubSetting} from "~/types/api/item/clubDependent/clubSetting";
import ClubSettingQuery from "~/composables/api/query/clubDependent/ClubSettingQuery";
import type {SelectApiItem} from "~/types/select";
import type {Season} from "~/types/api/item/season";
import {clubHasControlActivity, getSelectMenuClubActivity} from "~/types/api/item/club";
import {displayApiError} from "~/utils/resource";

definePageMeta({
  layout: "admin"
});

useHead({
  title: 'Configuration globale'
})

const toast = useToast()

const selfStore = useSelfUserStore();
const { selectedProfile } = storeToRefs(selfStore)

const clubSettingQuery = new ClubSettingQuery();
const activityQuery = new ActivityQuery();

const configState = reactive({
  selectedControlShootingActivity: selectedProfile.value?.club.settings.controlShootingActivity?.uuid,
  excludedActivitiesFromOpeningDays: selectedProfile.value?.club.settings.excludedActivitiesFromOpeningDays?.map((a: Activity) => a.uuid),
  selectedMonth: selectedProfile.value?.club.settings.seasonEnd.split('-')[0].toString(),
  selectedDay: selectedProfile.value?.club.settings.seasonEnd.split('-')[1].toString(),
  activity: getSelectMenuClubActivity().find((item) => item.value === selectedProfile.value?.club.settings.activity),
  emailReplyTo: selectedProfile.value?.club.settings.emailReplyTo
})
const selectedControlShootingActivity: Ref<Activity | undefined> = ref(undefined);

const activities: Ref<Activity[] | undefined> = ref(undefined);
activityQuery.getAll().then(value => {
  activities.value = value.items
})
const activitiesSelect = computed( () => {
  const items: SelectApiItem<Activity>[] = []
  activities.value?.forEach(value => {
    items.push({
      label: value.name,
      value: value.uuid,
      item: value
    })
  })
  return items;
})

const logoUploading = ref(false)

const monthsSelect: SelectApiItem<Season>[] = [
  {
    value: '01',
    label: 'Janvier'
  },
  {
    value: '02',
    label: 'Février'
  },
  {
    value: '03',
    label: 'Mars'
  },
  {
    value: '04',
    label: 'Avril'
  },
  {
    value: '05',
    label: 'Mai'
  },
  {
    value: '06',
    label: 'Juin'
  },
  {
    value: '07',
    label: 'Juillet'
  },
  {
    value: '08',
    label: 'Août'
  },
  {
    value: '09',
    label: 'Septembre'
  },
  {
    value: '10',
    label: 'Octobre'
  },
  {
    value: '11',
    label: 'Novembre'
  }
  ,{
    value: '12',
    label: 'Décembre'
  }
]

const daysSelect = computed( () => {
  const items: SelectApiItem<Season>[] = []

  let maxDays = 31
  if (configState.selectedMonth) {
    if (['04', '06', '09', '11'].includes(configState.selectedMonth)) {
      maxDays = 30
    }

    if (configState.selectedMonth === '02') {
      maxDays = 28
    }
  }

  for (let i = maxDays; i > 0; i--) {
    items.push({
      label: i.toString(),
      value: i < 10 ? '0' + i.toString() : i.toString()
    })
  }

  return items;
})

async function controlShootingUpdated() {
  if (!selectedProfile.value?.club.settings) return;

  if (configState.selectedControlShootingActivity) {
    selectedControlShootingActivity.value = await getActivity(configState.selectedControlShootingActivity)
  } else {
    selectedControlShootingActivity.value = undefined
  }

  const payload: WriteClubSetting = {
    controlShootingActivity: selectedControlShootingActivity.value? selectedControlShootingActivity.value["@id"] : null
  }

  const { error } = await clubSettingQuery.patch(selectedProfile.value.club.settings, payload);

  if (error) {
    displayApiError(error)
    return;
  }

  selfStore.refreshSelectedClub().then()

  toast.add({
    color: "success",
    title: "Paramètre enregistré"
  });
}

async function ignoredActivitiesDaysUpdated() {
  if (!selectedProfile.value?.club.settings) return;

  const uris: string[] = []
  if (configState.excludedActivitiesFromOpeningDays) {
    for (const excludedActivity of configState.excludedActivitiesFromOpeningDays) {
      uris.push(`${activityQuery.getRootUrl()}/${excludedActivity}`)
    }
  }

  const payload: WriteClubSetting = {
    excludedActivitiesFromOpeningDays: uris
  }

  const { error } = await clubSettingQuery.patch(selectedProfile.value.club.settings, payload);

  if (error) {
    displayApiError(error)
    return;
  }

  selfStore.refreshSelectedClub().then()

  toast.add({
    color: "success",
    title: "Paramètre enregistré"
  });
}

async function getActivity(id: string) {
  const response = await activityQuery.get(id);
  return response.retrieved;
}

async function uploadLogo(event: Event) {
  if (!selectedProfile.value?.club.settings) return;

  const formData = getFileFormDataFromUInputChangeEvent(event);

  if (!formData) {
    return;
  }

  logoUploading.value = true
  const { created: _created1, error } = await clubSettingQuery.importLogo(selectedProfile.value.club.settings, formData)
  logoUploading.value = false

  if (error) {
    return displayFileErrorToast(error.message)
  }

  displayFileSuccessToast('Logo envoyé')
  await selfStore.refreshSelectedClub()
}

async function deleteLogo() {
  if (!selectedProfile.value?.club.settings) return;

  logoUploading.value = true

  const formData = new FormData()

  const { created: _created2, error } = await clubSettingQuery.importLogo(selectedProfile.value.club.settings, formData)
  logoUploading.value = false

  if (error) {
    displayApiError(error, "Erreur lors de la suppression du logo")
    return
  }

  await selfStore.refreshSelectedClub()
  displayFileSuccessToast('Logo supprimé')
}

async function seasonEndUpdated() {
  if (!selectedProfile.value?.club.settings ||
      !configState.selectedDay ||
      !configState.selectedMonth
  ) return;

  const payload: WriteClubSetting = {
    seasonEnd: `${configState.selectedMonth}-${configState.selectedDay}`
  }

  const { error } = await clubSettingQuery.patch(selectedProfile.value.club.settings, payload);

  if (error) {
    displayApiError(error)
    return;
  }

  selfStore.refreshSelectedClub().then()

  toast.add({
    color: "success",
    title: "Paramètre enregistré"
  });
}

async function clubActivityUpdated() {
  if (!selectedProfile.value?.club.settings ||
    !configState.activity?.value
  ) return;

  const payload: WriteClubSetting = {
    activity: configState.activity.value
  }

  const { error } = await clubSettingQuery.patch(selectedProfile.value.club.settings, payload);

  if (error) {
    displayApiError(error)
    return;
  }

  selfStore.refreshSelectedClub().then()

  toast.add({
    color: "success",
    title: "Paramètre enregistré"
  });
}

async function emailReplyToUpdated() {
  if (!selectedProfile.value?.club.settings ||
    !configState.emailReplyTo
  ) return;

  const payload: WriteClubSetting = {
    emailReplyTo: configState.emailReplyTo
  }

  const { error } = await clubSettingQuery.patch(selectedProfile.value.club.settings, payload);

  if (error) {
    displayApiError(error)
    return
  }

  selfStore.refreshSelectedClub().then()

  toast.add({
    color: "success",
    title: "Paramètre enregistré"
  })
}

</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <GenericCard title="Type d'activité">
      <div class="flex flex-col gap-4">
        <p class="text-xs">En définissant votre type d'activité, certaines options supplémentaires seront disponible (imports spécifiques par exemple). </p>

        <UFormField label="Type">
          <USelectMenu v-model="configState.activity" :items="getSelectMenuClubActivity()" placeholder="Non défini - Global" />
        </UFormField>

        <UButton class="w-fit" label="Sauvegarder" @click="clubActivityUpdated" />

        <p class="text-xs">
          Votre activité n'est pas listée, n'hésitez pas à <ContentLink to="https://about.narvik.app/contact" target="_blank">nous contacter</ContentLink> pour que nous l'ajoutions.
        </p>

      </div>
    </GenericCard>

    <GenericCard title="Date de fin saison">
      <div class="flex flex-col gap-4">
        <p class="text-xs">Pour les activités sportives, une saison se termine souvent la 31 août afin de débuter en même temps que la rentrée des classes en septembre.</p>
        <div class="grid grid-cols-2 gap-2">
          <UFormField label="Mois">
            <USelect v-model="configState.selectedMonth" :items="monthsSelect" placeholder="Non défini" />
          </UFormField>

          <UFormField label="Jour">
            <USelect v-model="configState.selectedDay" :items="daysSelect" placeholder="Non défini" />
          </UFormField>
        </div>

        <UButton class="w-fit" label="Sauvegarder" @click="seasonEndUpdated" />

      </div>
    </GenericCard>

    <div v-if="selectedProfile?.club.presencesEnabled" class="flex flex-col gap-4">
      <GenericCard title="Activités exclus du décompte des jours ouverts">
        <div>
          <USelectMenu
            v-model="configState.excludedActivitiesFromOpeningDays"
            :items="activitiesSelect"
            value-key="value"
            multiple
            @change="ignoredActivitiesDaysUpdated"
          >
            <template #default>
            <span v-if="configState.excludedActivitiesFromOpeningDays && activities && configState.excludedActivitiesFromOpeningDays.length" class="truncate">
              {{ activities.filter(a => (a.uuid && configState.excludedActivitiesFromOpeningDays?.includes(a.uuid)) ).map(a => a.name).join(', ') }}
            </span>
              <span v-else>Aucune activités exclus</span>
            </template>
          </USelectMenu>
        </div>
      </GenericCard>

      <GenericCard v-if="clubHasControlActivity(selectedProfile?.club.settings.activity)" title="Activité correspondante au contrôle">
        <div class="flex flex-col gap-2">
          <div class="text-xs">
            <p>Certaines activités sportives peuvent avoir un contrôle annuel obligatoire.</p>
            <p>En créant une activité dédié pour, cela permettra d'alerter le membre lorsque ce contrôle doit de nouveau être effectué.</p>
          </div>

          <USelect
            v-model="configState.selectedControlShootingActivity"
            :items="activitiesSelect"
            placeholder="Aucun contrôle défini"
            @change="controlShootingUpdated" />

          <UButton
v-if="configState.selectedControlShootingActivity"
                   class="w-fit"
                   @click="
                  configState.selectedControlShootingActivity = undefined;
                  controlShootingUpdated()
                 "
          >
            Désactiver l'activité de contrôle
          </UButton>
        </div>
      </GenericCard>
    </div>

    <div class="flex flex-col gap-4">
      <GenericCard title="Logo">
        <div v-if="selectedProfile?.club?.settings?.logoBase64" class="mt-4 flex justify-center">
          <NuxtImg :src="selectedProfile.club.settings.logoBase64" class="w-48" />
        </div>

        <UInput
            :loading="logoUploading"
            class="my-4"
            type="file"
            accept="image/png"
            icon="i-heroicons-paint-brush"
            @change="uploadLogo"
        />

        <UModal v-if="selectedProfile?.club.settings.logo">
          <UButton color="error">
            Supprimer le logo
          </UButton>

          <template #content>
            <div>
              <UCard>
                <div class="flex flex-col gap-4">
                  <div class="text-center text-lg font-bold">Êtes-vous certain ?</div>

                  <UButton color="error" class="mx-auto" @click="deleteLogo">
                    Supprimer le logo
                  </UButton>
                </div>
              </UCard>
            </div>
          </template>

        </UModal>

      </GenericCard>

      <GenericCard title="Email">
        <div class="flex flex-col gap-2">
          <div class="text-xs">
            <p>A quelle adresse doivent être envoyées les réponses aux emails envoyés par votre club ?</p>
          </div>

          <UInput
            v-model="configState.emailReplyTo"
            icon="i-heroicons-envelope"
            placeholder="replyTo"
          />

          <UButton class="w-fit" label="Sauvegarder" @click="emailReplyToUpdated" />
        </div>
      </GenericCard>
    </div>
  </div>
</template>


<style lang="css" scoped>

</style>

