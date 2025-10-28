<script setup lang="ts">
import type {PropType} from "vue";

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number]
  },
  valueClass: {
    type: String
  },
  tooltip: {
    type: String
  },

  isIncreasing: {
    type: [Boolean],
    default: undefined,
  },
  topRight: {
    type: Object as PropType<topRight>,
    default: undefined
  }
});

const emit = defineEmits([
  'card-clicked'
])

interface topRight {
  value?: string|number,
  tooltip?: string|null,
  icon?: string|null,
  useDefaultIcon?: boolean
}

const iconUp = 'heroicons:arrow-trending-up-20-solid'
const iconDown = 'heroicons:arrow-trending-down-20-solid'

const valueClass = computed( () => {
  let classes = 'text-3xl font-semibold flex-1 flex justify-center items-center text-center'
  if (props.valueClass) {
    classes += ' ' + props.valueClass
  }

  return classes
})


const isIncreasing = computed( () => {
  return props.isIncreasing;
})

const topRight = computed( () => {
  return props.topRight;
})

const topRightClass = computed( () => {
  let value = "flex items-center justify-end text-md"
  if (isIncreasing.value != undefined) {
    if (isIncreasing.value) {
      value += " text-success-500"
    } else {
      value += " text-error-500"
    }
  }
  return value;
})

const topRightColor = computed( () => {
  if (isIncreasing.value != undefined) {
    if (isIncreasing.value) {
      return 'success'
    } else {
      return 'error'
    }
  }
  return 'neutral'
})

const topRightIcon = computed( () => {
  if (!topRight.value) return undefined;

  let icon = undefined;
  if ((topRight.value.useDefaultIcon || topRight.value.useDefaultIcon == undefined) && isIncreasing.value != undefined) {
    if (isIncreasing.value) {
      icon = iconUp
    } else {
      icon = iconDown
    }
  }

  if (topRight.value.icon) {
    icon = topRight.value.icon
  }

  return icon
});

</script>

<template>
  <UCard
    class="flex flex-col justify-center shadow"
    :ui="{
      body: 'p-4 sm:p-4'
    }"
  >

    <div v-if="loading" class="flex flex-col items-center h-full">
      <USkeleton class="h-4 w-10 self-end" />
      <USkeleton class="h-4 w-full flex-1 m-4" />
      <USkeleton class="h-4 w-full" />
    </div>

    <div v-else class="h-full flex flex-col justify-center align-middle" @click="emit('card-clicked')">

      <slot name="top">
        <p v-if="props.topRight" :class="topRightClass">
            <UTooltip :delay-duration="0" :text="props.topRight.tooltip ?? undefined">
                <UBadge :color="topRightColor" variant="soft" :trailing-icon="topRightIcon">
                  <span class="font-bold">{{ props.topRight.value }}</span>
                </UBadge>
            </UTooltip>
        </p>
      </slot>

      <p :class="valueClass"><slot name="value">{{ props.value }}</slot></p>
      <UTooltip :delay-duration="0" :text="props.tooltip" class="w-full justify-center text-center">
        <div><p class="text-lg text-center">{{ props.title }}</p></div>
      </UTooltip>
    </div>

  </UCard>
</template>

<style scoped lang="css">

</style>
