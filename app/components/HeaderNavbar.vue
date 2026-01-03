<script setup lang="ts">
  import {useSelfUserStore} from "~/stores/useSelfUser";
  import {useAppConfigStore} from "~/stores/useAppConfig";
  import { isDesktop, isTablet, watchBreakpoint} from "~/utils/browser";
  import ModalSelectProfile from "~/components/Modal/ModalSelectProfile.vue";
  import type { DropdownMenuItem } from "#ui/components/DropdownMenu";
  import {Permission} from "~/types/api/permissions";

  const overlay = useOverlay()

  const selfStore = useSelfUserStore();
  const appConfigStore = useAppConfigStore();


  const { selectedProfile, user } = storeToRefs(selfStore)

  // const, to avoid it being reactive and login back user
  const isAdmin = selfStore.isAdmin()
  const isBadger = selfStore.isBadger()
  const isSupervisor = computed(() => {
    return selfStore.hasSupervisorRole() && selectedProfile.value
  })

  // Check email access: admin OR supervisor with EMAIL_SEND permission
  const canAccessEmail = computed(() => {
    return isAdmin || selfStore.can(Permission.EmailSend)
  })

  const isDesktopDisplay = isDesktop()
  const isTabletDisplay = isTablet()

  const siteLogo: Ref<string> = appConfigStore.getLogo()

  const rightMenu = ref<DropdownMenuItem[][]>([
    [
      {
        slot: 'darkMode',
      }
    ],
    [
      {
        label: !isBadger ? 'Profil' : 'Pointeuse',
        icon: 'i-heroicons-user',
        to: !isBadger ? "/self" : ''
      }, {
        label: 'Changer de profil',
        icon: 'i-heroicons-arrow-path-rounded-square',
        class: (user.value?.linkedProfiles?.length ?? 0) > 1 ? 'cursor-pointer' : 'hidden',
        onSelect: () => {
          overlay.create(ModalSelectProfile).open({
            onSelected() {
              navigateTo('/self')
            }
          })
        }
      }
    ],
    [
      {
        label: 'Déconnexion',
        icon: 'i-heroicons-arrow-right-start-on-rectangle-20-solid',
        class: 'cursor-pointer',
        onSelect: () => {
          selfStore.logout()
        }
      }
    ]
  ])

  if (selfStore.isSuperAdmin()) {
    rightMenu.value.unshift([
      {
        label: 'Administration global',
        icon: 'i-heroicons-building-library',
        to: "/super-admin"
      }
    ]);
  }

  onMounted(() => {
    watchBreakpoint()
    window.addEventListener('resize', watchBreakpoint)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', watchBreakpoint)
  })
</script>

<template>
  <header
    class="bg-(--ui-bg) sticky top-0 z-50 h-16 print:hidden shadow-sm">
    <nav class="container mx-auto p-4 flex justify-between h-full overflow-y-auto">
      <div class="flex gap-4 flex-shrink-0">
        <NuxtLink to="/" class="flex align-middle">
          <UTooltip text="Accueil">
            <NuxtImg v-if="selectedProfile?.club?.settings?.logoBase64" :src="selectedProfile.club.settings.logoBase64" class="w-7 object-contain"/>
            <NuxtImg v-else :src="siteLogo" class="w-7 object-contain"/>
          </UTooltip>
        </NuxtLink>
        <UButton class="-mx-3 hidden lg:block" to="/" variant="ghost" color="neutral">Accueil</UButton>
        <div v-if="isSupervisor">
          <UButton to="/admin/sales/new" icon="i-heroicons-shopping-cart" variant="ghost" color="neutral">
            <template v-if="isDesktopDisplay || isTabletDisplay">
              Vente
            </template>
          </UButton>
        </div>
        <div v-if="canAccessEmail">
          <UButton to="/admin/email" icon="i-heroicons-envelope" variant="ghost" color="neutral">
            <template v-if="isDesktopDisplay || isTabletDisplay">
              Email
            </template>
          </UButton>
        </div>
      </div>
      <div class="flex gap-4">
        <div v-if="isSupervisor">
          <UButton to="/admin" icon="i-heroicons-key" variant="ghost" color="neutral">
            <template v-if="isDesktopDisplay || isTabletDisplay">
              Administration
            </template>
          </UButton>
        </div>
        <div v-if="selfStore.isImpersonating">
          <UButton color="warning" @click="selfStore.stopImpersonation()">Arrêter impersonification</UButton>
        </div>
        <UDropdownMenu :items="rightMenu">
          <UButton
            variant="ghost"
            color="neutral"
            :label="(isDesktopDisplay || isTabletDisplay) ? (!isBadger ? (selectedProfile?.displayName ?? user?.fullName) : 'Pointeuse') : undefined">
            <template #trailing>
              <UAvatar v-if="!isBadger"
                       size="xs"
                       :alt="selfStore.member?.fullName ?? user?.fullName"
                       :src="selfStore.member?.profileImageBase64"
              />
              <UIcon v-else
                     name="i-heroicons-clock"
              />
            </template>
          </UButton>
          <template #darkMode>
              <ThemeSwitcher class="mx-auto" />
          </template>
        </UDropdownMenu>
      </div>
    </nav>
  </header>
</template>

<style scoped lang="css">

</style>
