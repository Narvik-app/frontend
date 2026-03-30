<script setup lang="ts">
import {decodeUrlUuid} from "~/utils/resource";

definePageMeta({
    layout: "admin"
  });

  useHead({
    title: 'Détails membre'
  })

  const route = useRoute()

  let memberId = ''
  try {
    memberId = decodeUrlUuid(route.params.id.toString());
  } catch (e) {
    memberId = route.params.id.toString();
  }
</script>

<template>
  <MemberDetails :member-id="memberId" />
</template>

<style scoped lang="css">

</style>
