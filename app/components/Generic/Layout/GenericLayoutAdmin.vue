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


// We create the custom items props so we can auto close the menu on page change
const cItems: GroupedNavigationLinks[] = []
props.items?.forEach(value => {
  let item : GroupedNavigationLinks = {
    title: value.title,
    links: []
  }
  value.links.forEach(link => {
    Object.assign(link, {
      onSelect() {
        menuVisible.value = false // We close the menu
      }})
    item.links.push(link)
  })

  cItems.push(item)
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
            <template v-if="menuVisible" v-for="groupedLinks in cItems">
              <USeparator v-if="groupedLinks.title !== undefined"
                        class="p-2"
                        :label="groupedLinks.title"
              />

              <UNavigationMenu
                orientation="vertical"
                :items="groupedLinks.links"
              />
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
