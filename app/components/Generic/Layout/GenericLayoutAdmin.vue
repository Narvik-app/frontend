<script setup lang="ts">
import {isDesktop} from "~/utils/browser";
import type {GroupedNavigationLinks} from "~/types/groupedNavigationLinks";
import type {PropType} from "vue";

const props = defineProps(
  {
    items: {
      type: Array as PropType<GroupedNavigationLinks[]>,
    }
  }
)

const isDesktopDisplay = isDesktop()
const menuVisible: Ref<boolean> = ref(false)
watchEffect(() => {
  menuVisible.value = isDesktopDisplay.value;
})


const route = useRoute()

// We create the custom items props so we can auto close the menu on page change
const cItems = computed(() => {
  const items: GroupedNavigationLinks[] = []

  // First pass: find the longest matching path to avoid multi-activation (e.g. /admin/sales and /admin/sales/history)
  let longestMatchPath = ''

  props.items?.forEach(value => {
    value.links.forEach((link: any) => {
      if (!link.to) return

      const isMatch = route.path === link.to || (route.path.startsWith(link.to + '/') && link.to !== '/admin')
      if (isMatch && link.to.length > longestMatchPath.length) {
        longestMatchPath = link.to
      }
    })
  })

  // Second pass: build items and set active state
  props.items?.forEach(value => {
    const item : GroupedNavigationLinks = {
      title: value.title,
      links: []
    }
    value.links.forEach((link: any) => {
      // Create a copy to avoid mutating props
      const newLink = { ...link }

      // We push into the link object our custom onSelect trigger
      newLink.onSelect = () => {
        if (isDesktopDisplay.value) {
          menuVisible.value = true // On pc it's always open
        } else {
          menuVisible.value = false // We close the menu
        }
      }

      // Handle active state using longest match
      if (newLink.to && newLink.to === longestMatchPath) {
          newLink.active = true
      }

      item.links.push(newLink)
    })

    items.push(item)
  })
  return items
})

</script>

<template>
  <div class="flex flex-col">
    <HeaderNavbar />
    <main class="min-h-full flex-1">
      <div class="container mx-auto p-4">
        <div class="flex flex-col xl:flex xl:flex-row xl:gap-8">
          <div class="mb-4 xl:mb-0 xl:basis-60 xl:sticky xl:top-20 h-fit print:hidden">
            <UButton
              v-if="!isDesktopDisplay"
              class="mb-2"
              icon="i-heroicons-bars-3"
              :label="menuVisible ? 'Masquer le menu' : 'Menu'"
              @click="menuVisible = !menuVisible"
            />
            <template v-if="menuVisible">
              <template v-for="(groupedLinks, gIndex) in cItems" :key="gIndex">
              <USeparator
v-if="groupedLinks.title !== undefined"
                        class="p-2"
                        :label="groupedLinks.title"
              />

              <UNavigationMenu
                orientation="vertical"
                :items="groupedLinks.links"
              />
              </template>
            </template>

          </div>
          <div class="xl:basis-full">
            <slot />
          </div>
        </div>

      </div>
    </main>
    <footer class="print:hidden mb-4">
      <FooterCopyright />
    </footer>
  </div>
</template>

<style scoped lang="css">

</style>
