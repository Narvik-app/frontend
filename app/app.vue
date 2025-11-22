<script setup lang="ts">
import ModalLegalsAcceptance from "~/components/Modal/ModalLegalsAcceptance";
import {convertUuidToUrlUuid} from "~/utils/resource";

const appConfig = useAppConfig()
const runtimeConfig = useRuntimeConfig()

const selfUser = useSelfUserStore()

if (import.meta.client) {
  if (runtimeConfig.public.umamiEnabled) {
    const { proxy } = useScriptUmamiAnalytics({
      websiteId: runtimeConfig.public.umamiWebsiteId as string,
      scriptInput: {
        src: runtimeConfig.public.umamiScript as string,
      },
    })

    if (selfUser.isLogged() && selfUser.user?.uuid) {
      proxy.identify(convertUuidToUrlUuid(selfUser.user.uuid))
    } else {
      proxy.identify(undefined)
    }
  }

  if (!selfUser.isLegalsAccepted()) {
    useOverlay().create(ModalLegalsAcceptance).open()
  }
}
</script>

<template>
  <UApp :toaster="appConfig.toaster">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
