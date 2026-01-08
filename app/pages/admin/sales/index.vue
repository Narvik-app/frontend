<script setup lang="ts">
definePageMeta({
  layout: "pos"
});

useHead({
  title: 'Vente'
})
</script>

<template>
  <SaleList :per-item="true" />
</template>

<style scoped lang="css">

</style>
