<script setup lang="ts">
  import {useAppConfigStore} from "~/stores/useAppConfig";
  import dayjs from "dayjs";

  const props = defineProps({
    displayVersion: {
      type: Boolean,
      default: true
    },
  })

  const runtimeConfig = useRuntimeConfig()
  const appConfigStore = useAppConfigStore()

  const logoNk: Ref<string> = appConfigStore.getLogoNk()

  interface externalLink {
    label: string,
    to: string,
  }

  const versions: externalLink[] = [
    {
      label: `Version ${runtimeConfig.public.clientVersion}`,
      to: 'https://github.com/Narvik-app/frontend'
    }
  ]
  if (appConfigStore.config?.appVersion) {
    versions.push({
      label: `Backend ${appConfigStore.config.appVersion}`,
      to: 'https://github.com/Narvik-app/backend'
    })
  }

  const externalLinks: externalLink[] = [
    {
      label: 'Politique de confidentialité',
      to: 'https://about.narvik.app/documents-legaux/rgpd'
    },
    {
      label: 'Conditions Générales d’Utilisation',
      to: 'https://about.narvik.app/documents-legaux/cgu'
    },
    {
      label: 'Mentions légales',
      to: 'https://about.narvik.app/documents-legaux/mentions-legales'
    }
  ]
</script>

<template>
  <div class="container mx-auto mt-12">

    <div class="mx-4 dark:bg-(--ui-bg-elevated)/50 border border-neutral-100 dark:border-transparent rounded-xl shadow-md px-12 py-8 grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
      <div class="flex flex-col justify-center items-center lg:items-start">
        <NuxtLink class="transition opacity-85 hover:opacity-100" to="https://about.narvik.app" target="_blank" ><NuxtImg :src="logoNk" /></NuxtLink>
        <div class="hidden lg:block mt-2 text-xs">
          © 2024 - {{ dayjs().year() }}. Tous droits réservés
        </div>
      </div>
      <div class="flex flex-col justify-center items-center">
        <div><ContentLink to="https://about.narvik.app" target="_blank">À propos de Narvik</ContentLink></div>
        <div><ContentLink to="https://docs.narvik.app" target="_blank">Documentation</ContentLink></div>
        <div><ContentLink to="https://about.narvik.app/contact" target="_blank">Nous contacter</ContentLink></div>
        <div><ContentLink to="https://github.com/Narvik-app" target="_blank">Github</ContentLink></div>
      </div>
      <div class="flex flex-col gap-1 justify-center items-center lg:items-end text-xs">
        <template v-for="(val, index) in externalLinks">
          <div><ContentLink class="text-(--ui-text) dark:text-white dark:hover:text-white" :to="val.to" target="_blank" >{{ val.label }}</ContentLink></div>
        </template>

        <ThemeSwitcher class="mt-2 lg:mt-0" />
      </div>

      <div v-if="props.displayVersion" class="-mt-2 lg:-mt-4 lg:col-span-3 transition opacity-40 hover:opacity-70 flex flex-row justify-center lg:justify-end  text-[.6rem] gap-1">
        <template v-for="(val, index) in versions">
          <span v-if="index !== 0"> - </span>
          <NuxtLink :to="val.to" target="_blank" >{{ val.label }}</NuxtLink>
        </template>
      </div>

    </div>

  </div>
</template>

<style scoped lang="css">

</style>
