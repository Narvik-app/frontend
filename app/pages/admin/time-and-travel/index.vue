<script setup lang="ts">
import type {TimeAndTravelDeclaration} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration'
import type {Member} from '~/types/api/item/clubDependent/member'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'
import TimeAndTravelDeclarationsTable from '~/components/TimeAndTravel/TimeAndTravelDeclarationsTable.vue'

definePageMeta({layout: 'time-and-travel'})
useHead({title: 'Déclarations'})

const selfStore = useSelfUserStore()
const canEdit = computed(() => selfStore.can(Permission.TimeAndTravelEdit))

const declarationsTable = ref<InstanceType<typeof TimeAndTravelDeclarationsTable>>()
const declarationModalOpen = ref(false)
const newDeclarationMember = ref<Member | undefined>()
const selectedDeclaration = ref<TimeAndTravelDeclaration | undefined>()
const selectedDeclarationMember = ref<Member | undefined>()

function onCreate() {
  newDeclarationMember.value = undefined
  selectedDeclaration.value = undefined
  selectedDeclarationMember.value = undefined
  declarationModalOpen.value = true
}

function onEdit(declaration: TimeAndTravelDeclaration) {
  selectedDeclaration.value = declaration
  selectedDeclarationMember.value = typeof declaration.member === 'object' ? declaration.member : undefined
  newDeclarationMember.value = undefined
  declarationModalOpen.value = true
}

function onDeclarationCreated() {
  declarationModalOpen.value = false
  newDeclarationMember.value = undefined
  selectedDeclaration.value = undefined
  selectedDeclarationMember.value = undefined
  declarationsTable.value?.refresh()
}
</script>

<template>
  <TimeAndTravelDeclarationsTable ref="declarationsTable" :can-edit="canEdit" @create="onCreate" @edit="onEdit" />

  <UModal v-model:open="declarationModalOpen">
    <template #content>
      <UCard>
        <div class="flex flex-col gap-4">
          <GenericMemberPicker v-if="!selectedDeclaration" v-model="newDeclarationMember" label="Membre" />
          <TimeAndTravelDeclarationForm
            v-if="selectedDeclaration ? selectedDeclarationMember : newDeclarationMember"
            :item="selectedDeclaration"
            :member="(selectedDeclaration ? selectedDeclarationMember : newDeclarationMember)!"
            @updated="onDeclarationCreated"
            @canceled="declarationModalOpen = false"
          />
        </div>
      </UCard>
    </template>
  </UModal>
</template>
