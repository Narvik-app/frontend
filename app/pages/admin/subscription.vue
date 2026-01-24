<script lang="ts" setup>

import {useSelfUserStore} from "~/stores/useSelfUser";
import {formatDateReadable} from "~/utils/date";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import ClubQuery from "~/composables/api/query/ClubQuery";

definePageMeta({
  layout: "admin",
});

useHead({
  title: 'Abonnement'
})

const selfStore = useSelfUserStore()

const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
const selfClubModalOpen = ref(false)

async function deleteClub() {
  const club = selfStore.selectedProfile?.club

  if (!club) {
    return
  }

  const clubQuery = new ClubQuery()
  const { updated: _updated } = await clubQuery.programDeletion()

  await selfStore.refreshSelectedClub()
}

</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-6 gap-4">
    <GenericCardWithActions class="lg:col-span-4" title="Information sur l'abonnement">
      <template #actions>
        <UButton
v-if="!selfStore.selectedProfile?.club.deletionDate"
          color="error"
          @click="
            overlayDeleteConfirmation.open({
              title: 'Nous sommes désolés de vous voir partir',
              alertDescription: 'Afin de vous permettre de récupérer vos données, l\'association sera automatiquement supprimé un mois après la fin de votre abonnement.',
              alertColor: 'error',
              async onDelete() {
                await deleteClub()
                overlayDeleteConfirmation.close(true)
              }
            })
          "
        >
          Supprimer l'association
        </UButton>
      </template>

      <div>
        <p class="text-sm my-2">
          Pour toutes modifications liée à votre offre d'abonnement, vous pouvez prendre contact avec nous en vous rendant à l'adresse suivante : <ContentLink to="https://about.narvik.app/contact" target="_blank">https://about.narvik.app/contact</ContentLink>
        </p>

        <div v-if="!selfStore.selectedProfile?.club">
          <UAlert
            color="error"
            title="Impossible d'obtenir les informations sur l'association."
            description="Veuillez rafraichir la page ou vous reconnecter si cela ne corrige pas le problème."
          />
        </div>
        <div v-else>
          <p>
            <b>Statut</b> : <span :class="selfStore.selectedProfile.club.isActivated ? '' : 'text-error-500'">{{ selfStore.selectedProfile.club.isActivated ? 'Actif' : 'Non actif' }}</span>
          </p>

          <p v-if="selfStore.selectedProfile.club.renewDate">
            <b>Date de renouvellement</b> : {{ formatDateReadable(selfStore.selectedProfile.club.renewDate.toString()) }}
          </p>

          <div v-if="selfStore.selectedProfile.club.deletionDate">
            <b class="text-error-500">Date de suppression</b> : {{ formatDateReadable(selfStore.selectedProfile.club.deletionDate.toString()) }}
            <p class="text-xs">Pour annuler la suppression, veuillez <ContentLink to="https://about.narvik.app/contact" target="_blank">nous contacter</ContentLink>.</p>
          </div>

          <UCard class="mt-4">
            <ClubSubscriptionList :item="selfStore.selectedProfile.club" />
          </UCard>
        </div>
      </div>
    </GenericCardWithActions>

    <GenericCardWithActions v-if="selfStore.selectedProfile?.club" class="lg:col-span-2 h-fit" title="Facturation">
      <template #actions>
        <UButton @click="selfClubModalOpen = true">Modifier</UButton>
      </template>

      <div class="mb-4">
        <p v-if="selfStore.selectedProfile.club.contactName">
          <b>Nom</b> : {{ selfStore.selectedProfile.club.contactName }}
        </p>
        <p v-if="selfStore.selectedProfile.club.contactPhone">
          <b>Téléphone</b> : {{ selfStore.selectedProfile.club.contactPhone }}
        </p>
        <p v-if="selfStore.selectedProfile.club.contactEmail">
          <b>Email</b> : {{ selfStore.selectedProfile.club.contactEmail }}
        </p>
        <p v-if="selfStore.selectedProfile.club.website">
          <b>Site</b> : {{ selfStore.selectedProfile.club.website }}
        </p>
      </div>

      <div>
        <p>
          <b>Nom</b> : {{ selfStore.selectedProfile.club.name }}
        </p>
        <p>
          <b>Adresse</b> : {{ selfStore.selectedProfile.club.address }}
        </p>
        <p>
          <b>Code postal</b> : {{ selfStore.selectedProfile.club.zipCode }}
        </p>
        <p>
          <b>Ville</b> : {{ selfStore.selectedProfile.club.city }}
        </p>
        <p>
          <b>Siret</b> : {{ selfStore.selectedProfile.club.siret ?? 'Non défini' }}
        </p>
        <p>
          <b>TVA</b> : {{ selfStore.selectedProfile.club.vat ?? 'Non défini' }}
        </p>
      </div>
    </GenericCardWithActions>

    <UModal
      v-model:open="selfClubModalOpen">
      <template #content>
        <div>
          <UCard>
            <ClubForm
v-if="selfStore.selectedProfile"
                      :is-self-edit="true"
                      :item="{...selfStore.selectedProfile.club}"
                      @updated="(value) => {selfClubModalOpen = false; selfStore.refreshSelectedClub() }"
            />
          </UCard>
        </div>
      </template>
    </UModal>
  </div>
</template>
