<script lang="ts" setup>
import FooterCopyright from "~/components/FooterCopyright.vue";


useHead({
  titleTemplate: (title) => {
    return title ? `${title} - Narvik` : 'Narvik'
  }
})
</script>

<template>
  <div class="flex flex-col pb-20 lg:pb-0">
    <HeaderNavbar />
    <main class="min-h-full flex-1">
      <div>
        <div class="container mx-auto p-4">
          <slot/>
        </div>
      </div>
    </main>
    <footer class="print:hidden mb-4">
      <FooterCopyright />
    </footer>
  </div>
</template>

<style lang="css" scoped>

</style>
