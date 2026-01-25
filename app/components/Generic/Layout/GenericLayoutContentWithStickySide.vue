<script setup lang="ts">

import {isDesktop, isTablet} from "~/utils/browser";

const props = defineProps(
  {
    displaySide: {
      type: Boolean,
      default: true
    },
    hasSideContent: {
      type: Boolean,
      default: true
    },
    mobileSideTitle: {
      type: String,
      default: 'Afficher'
    }
  }
)

const isDesktopDisplay = isDesktop()
const isTabletDisplay = isTablet()

const asideMobileClasses = ref(['overflow-y-auto', 'flex flex-col gap-4 fixed bottom-0 left-0 right-0 rounded-t-lg backdrop-blur-2xl z-10'])
const asideDesktopClasses = 'print:hidden lg:sticky lg:top-19 lg:h-fit lg:max-h-[calc(100vh-6rem)] -mt-1'
const asideButtonMargin = ref('')

const sideClasses = computed(() => {
  return asideMobileClasses.value.join(' ') + ' ' + asideDesktopClasses
})

const sideMobileVisible = ref(false)
watchEffect(() => {
  if (isDesktopDisplay.value || isTabletDisplay.value) {
    sideMobileVisible.value = true
  }

  const openClasses = 'max-h-[45vh]'
  const closedClasses = ''

  // Side menu open
  if (sideMobileVisible.value) {
    asideButtonMargin.value = '-mb-4'
    asideMobileClasses.value.push(openClasses)
    asideMobileClasses.value = asideMobileClasses.value.filter(e => e !== closedClasses)
  } else {
    asideButtonMargin.value = ''
    asideMobileClasses.value.push(closedClasses)
    asideMobileClasses.value = asideMobileClasses.value.filter(e => e !== openClasses)
  }
})

</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div class="lg:col-span-2">
      <slot name="main"/>
    </div>

    <div v-if="props.displaySide" :class="sideClasses">
      <div v-if="hasSideContent" :class="`text-center lg:hidden print:hidden ${asideButtonMargin}`">
        <UButton
          block
          :ui="{ rounded: 'rounded-t-lg rounded-b-none' }"
          variant="soft"
          @click="sideMobileVisible = !sideMobileVisible"
        >
          <UIcon :name="'i-heroicons-chevron-double-' + (sideMobileVisible ? 'down' : 'up')" />
          <span class="flex-1">{{ props.mobileSideTitle }}</span>
          <UIcon :name="'i-heroicons-chevron-double-' + (sideMobileVisible ? 'down' : 'up')" />
        </UButton>
      </div>
      <div v-if="sideMobileVisible" class="overflow-y-auto">
        <div class="p-1 flex flex-col gap-4">
          <slot name="side"/>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped lang="css">

</style>
