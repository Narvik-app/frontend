<script setup lang="ts">
import FooterCopyright from "~/components/FooterCopyright.vue";

useSeoMeta({
  description: 'Narvik est une plateforme en ligne permettant de simplifier la gestion d\'une association'
})

</script>

<template>
  <div class="flex flex-col">
    <main class="min-h-full flex-1 flex justify-center items-center">
      <div class="container m-auto p-4 md:p-12 md:max-w-screen-md">
        <slot/>
      </div>
    </main>
    <footer class="print:hidden mb-4">
      <FooterCopyright :display-version="false" />
    </footer>
  </div>
</template>

<style lang="css" scoped>

</style>
