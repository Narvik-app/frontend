<script setup lang="ts">
import type {NuxtError} from '#app'

const props = defineProps({
  error: Object as () => NuxtError
})

const handleError = () => clearError({ redirect: '/' })
</script>

<template>

  <div class="flex flex-col">
    <HeaderNavbar/>
    <main class="min-h-full flex-1 flex justify-center items-center">
        <UContainer class="mx-auto p-4">
          <div class="flex flex-col gap-4">
            <div class="text-center">
              <h1 class="text-6xl font-bold mb-4">{{ props.error?.statusCode }}</h1>
              <h1 class="text-xl mb-4">{{ props.error?.message }}</h1>
              <UButton class="cursor-pointer" size="xl" @click="handleError">Page d'accueil</UButton>
            </div>
          </div>
        </UContainer>
    </main>
    <footer class="mt-8 print:hidden">
      <FooterCopyright/>
    </footer>
  </div>
</template>
