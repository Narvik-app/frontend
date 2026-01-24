<script setup lang="ts">
import {useLoginBadger} from "~/composables/api/api";
import {useSelfUserStore} from "~/stores/useSelfUser";

const route = useRoute()

  const selfStore = useSelfUserStore();

  if (selfStore.isLogged()) {
    navigateTo('/');
  } else {
    try {
      if (route.params.slug.length !== 2) {
        navigateTo('/login')
      }
      await useLoginBadger(route.params.slug[0], route.params.slug[1]);
    } catch (_e) {
      navigateTo('/login')
    }

    navigateTo('/');
  }
</script>

<template>
  <div/>
</template>

<style lang="css" scoped>

</style>
