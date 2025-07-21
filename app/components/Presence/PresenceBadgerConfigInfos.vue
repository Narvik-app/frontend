<script setup lang="ts">
import clipboard from "clipboardy";
import {generateBadgerLoginPath} from "~/utils/resource";

const props = defineProps({
  badgerToken: {
    type: String,
  },
  clubUuid: {
    type: String,
  }
});

const toast = useToast()

function getBadgerLoginPath(): string|undefined {
  if (!props.badgerToken || !props.clubUuid) {
    return undefined
  }

  return generateBadgerLoginPath(props.clubUuid, props.badgerToken)
}

function copyBadgerLink() {
  if (!getBadgerLoginPath()) return;

  clipboard.write(window.location.origin + getBadgerLoginPath())
  toast.add({
    title: 'URL Copiée',
    color: "success"
  })
}

</script>

<template>
  <div>
    <p>A mettre en favoris sur l'ordinateur accessible publiquement.</p>
    <p>Ce lien permet d'être automatiquement connecté en tant que pointeuse (accès seulement à l'enregistrement des présences).</p>
    <p class="mb-4">Le lien peut être déposé directement dans la barre personnelle pour le marquer en favoris.</p>

    <div v-if="!getBadgerLoginPath()">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="warning"
        title="Lien de connexion non généré."
      />
    </div>
    <div v-else
         class="break-words cursor-pointer"
         @click.prevent="copyBadgerLink"
    >

      <a :href="getBadgerLoginPath()"
         class="focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 flex-shrink-0 font-medium rounded-md text-sm gap-x-1.5 px-2.5 py-1.5 shadow-sm text-white dark:text-gray-900 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500 dark:bg-yellow-400 dark:hover:bg-yellow-500 dark:disabled:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500 dark:focus-visible:outline-yellow-400 flex justify-center"
      >
        Gestion de présence
      </a>
      <ContentLink :to="getBadgerLoginPath()" class="text-[.6rem] break-all">{{ getBadgerLoginPath() }}</ContentLink>
    </div>
  </div>
</template>

<style scoped lang="css">

</style>
