<script setup lang="ts">
import {decodeUrlUuid} from "~/utils/resource";

definePageMeta({
    layout: "admin"
  });

  useHead({
    title: 'Détails membre'
  })

  const route = useRoute()
  const memberId = decodeUrlUuid(route.params.id.toString());
</script>

<template>
  <MemberDetails :member-id="memberId" />
</template>

<style scoped lang="css">

</style>
