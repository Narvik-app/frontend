<script setup lang="ts">
import {useSelfUserStore} from "~/stores/useSelfUser";
import {useAppConfigStore} from "~/stores/useAppConfig";
import {isDesktop, isTablet, watchBreakpoint} from "~/utils/browser";
import ModalSelectProfile from "~/components/Modal/ModalSelectProfile.vue";
import type {DropdownMenuItem} from "#ui/components/DropdownMenu";
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

  // Check email access - can() already checks for admin status
  const canAccessEmail = computed(() => {
    return selfStore.can(Permission.EmailAccess)
  })

  // Smart sales button: determine target URL and visibility
  const salesButtonUrl = computed<string | null>(() => {
    // Only show if club has sales enabled
    if (!selfStore.selectedProfile?.club.salesEnabled) return null

    // Supervisors need specific permissions, admins always have access
    if (selfStore.isAdmin()) return '/admin/sales/new'

    // Check for SALE_NEW permission
    if (selfStore.can(Permission.SaleNew)) return '/admin/sales/new'

    // Check for any other sale access
    if (selfStore.can(Permission.SaleHistoryAccess)) return '/admin/sales/history'
    if (selfStore.can(Permission.SaleInventoryAccess)) return '/admin/inventories'
    if (selfStore.can(Permission.SaleCategoriesAccess)) return '/admin/inventories/categories'
    if (selfStore.can(Permission.SalePaymentModesAccess)) return '/admin/sales/payment-modes'
    if (selfStore.can(Permission.SaleImportAccess)) return '/admin/sales/import'

    return null
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
        <div v-if="isSupervisor && salesButtonUrl">
          <UButton :to="salesButtonUrl" icon="i-heroicons-shopping-cart" variant="ghost" color="neutral">
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
              <UAvatar
v-if="!isBadger"
                       size="xs"
                       :alt="selfStore.member?.fullName ?? user?.fullName"
                       :src="selfStore.member?.profileImageBase64"
              />
              <UIcon
v-else
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
