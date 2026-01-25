<script setup lang="ts">
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {TableRow} from "#ui/types";

const props = defineProps({
  query: {
    type: [String],
    required: false
  }
});

const emit = defineEmits([
  'selected-member',
])

const toast = useToast()

let inputTimer: NodeJS.Timeout;

const searching = ref(false);
const memberSelected = ref();
const foundMembers: Ref<Member[]> = ref([])
const searchQuery: Ref<string|undefined> = ref(undefined)

// Camera detection setup

const cameraPreview = ref(false)
const cameraIsPresent = verifyCameraIsPresent()

watch(searchQuery, (value) => {
  search(value)
})

if (props.query) {
  searchQuery.value = props.query
}

async function search(query: string | undefined | null, replayCount: number = 0) {
  clearTimeout(inputTimer);
  inputTimer = setTimeout(async () => {
    if (query === null || query.trim() === "") {
      searching.value = false;
      foundMembers.value = [];
      return;
    }

    searching.value = true;

    const memberQuery = new MemberQuery();
    const searchResult = await memberQuery.search(query);
    searching.value = false;

    if (searchResult.error) {
      if (searchResult.error.message.includes('The operation was aborted')) {
        // We replay the query
        if (replayCount < 5) {
          toast.add({
            color: "orange",
            title: "Problème réseau",
            description: `Il semblerait que la requête ne peut aboutir. Nouvelle tentative. (${replayCount + 1}/5)`
          })
          return await search(query, ++replayCount);
        } else {
          toast.add({
            color: "error",
            title: "Une erreur est survenue",
            description: "Il semblerait que la requête ne peut aboutir. Veuillez rafraichir la page."
          })
          return;
        }
      }

      toast.add({
        color: "error",
        title: "Une erreur est survenue",
        description: searchResult.error.message
      })

      return;
    }

    if (!searchResult.item) return;

    const members: Ref<Member[]> = ref([])
    members.value = searchResult.item

    foundMembers.value = members.value;
    if (members.value.length === 1) {
      rowClicked(members.value.at(0) as Member)
    }

  }, 800);
}

const columns = [{
  accessorKey: 'licence',
  header: 'Licence'
}, {
  accessorKey: 'fullName',
  header: 'Nom'
}]

function rowClicked(row: Member) {
  console.log(row)
  memberSelected.value = row
  emit('selected-member', row)
}

function onSelect(event: Event) {
  const input = event.target as HTMLInputElement|null;
  if (!input) {
    return
  }

  // Fix the issue when the modal is first opened with value filled from typing
  // Html on the focus will select all the data and so will be removed at the next typing...
  const length = input.value.length;
  if (length <= 1) {
    input.setSelectionRange(length, length)
    event.preventDefault()
  }
}

</script>

<template>
  <div class="flex flex-col justify-start px-4 py-4 rounded-lg divide-y divide-gray-200 dark:divide-gray-800 ring-1 ring-gray-200 dark:ring-gray-800 shadow bg-white dark:bg-gray-900 min-h-96">

    <UFormField label="Nom / Licence">
      <GenericBarcodeReader
        v-model="cameraPreview"
        class="mb-4"
        @decoded="(value) => {searchQuery = value}"
      />

      <UInput
          v-model="searchQuery"
          class="mb-4"
          :loading="searching"
          placeholder="Nom / Licence"
          trailing
          @select="onSelect"
      >
        <template v-if="cameraIsPresent || searchQuery" #trailing>
          <UIcon
            v-if="cameraIsPresent"
            class="cursor-pointer"
            name="i-heroicons-qr-code"
            @click="cameraPreview = true"
          />

          <UIcon
            v-if="searchQuery"
            class="cursor-pointer"
            name="i-heroicons-x-mark"
            @click="searchQuery = '';"
          />
        </template>
      </UInput>
    </UFormField>

    <UTable
        :loading="searching"
        class="w-full"
        :columns="columns"
        :data="foundMembers"
        :ui="{
          tr: 'cursor-pointer'
        }"
        @select="(evt: Event, row: TableRow<Member>) => rowClicked(row.original)"
    >
      <template #empty>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <span class="italic text-sm">Aucune résultat trouvé</span>
        </div>
      </template>
    </UTable>

  </div>
</template>

<style scoped lang="css">

</style>
