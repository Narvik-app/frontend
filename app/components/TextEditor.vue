<script setup lang="ts">
import TextAlign from '@tiptap/extension-text-align'
import {Color, TextStyle} from '@tiptap/extension-text-style'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps(
    {
      modelValue: {
        type: String
      },
      disabled: {
        type: Boolean
      }
    }
  )

  const emit = defineEmits(['update:modelValue', 'update:editor'])

  const textTypes = ref([
    {
      label: 'Paragraphe',
      value: 'paragraph'
    },
    {
      label: 'Titre 1',
      value: 'heading-1'
    },
    {
      label: 'Titre 2',
      value: 'heading-2'
    },
    {
      label: 'Titre 3',
      value: 'heading-3'
    }
  ])

  const colors = [
    { 'name': 'Noir', hex: '#000000' },
    { 'name': 'Gris foncé', hex: '#444444' },
    { 'name': 'Gris', hex: '#888888' },
    { 'name': 'Gris clair', hex: '#CCCCCC' },
    { 'name': 'Blanc', hex: '#FFFFFF' },
    { 'name': 'Rouge', hex: '#FF4C4C' },
    { 'name': 'Orange', hex: '#FF9900' },
    { 'name': 'Jaune', hex: '#FFEE58' },
    { 'name': 'Vert', hex: '#4CAF50' },
    { 'name': 'Bleu ciel', hex: '#00BCD4' },
    { 'name': 'Bleu', hex: '#2196F3' },
    { 'name': 'Violet', hex: '#9C27B0' },
    { 'name': 'Rose', hex: '#EC407A' }
  ]

  const editorRef = ref()
  const editor = computed<Editor | undefined>(() => editorRef.value?.editor)

  const extensions = [TextStyle, Color, TextAlign.configure({ types: ['heading', 'paragraph'] })]

  const currentTextType = computed(() => {
    if (!editor.value) return 'paragraph'
    if (editor.value.isActive('heading', { level: 1 })) return 'heading-1'
    if (editor.value.isActive('heading', { level: 2 })) return 'heading-2'
    if (editor.value.isActive('heading', { level: 3 })) return 'heading-3'
    return 'paragraph'
  })
  const selectedTextType = ref(currentTextType.value)

  const color = ref('#000000')
  const chip = computed(() => ({ backgroundColor: color.value }))

  watch(editor, (ed) => {
    if (ed) {
      emit('update:editor', ed)

      ed.on('selectionUpdate', () => {
        const newType = currentTextType.value
        if (newType !== selectedTextType.value) {
          selectedTextType.value = newType
        }

        const newColor = ed.getAttributes('textStyle').color || "#000000"
        if (newColor !== color.value) {
          color.value = newColor
        }
      })

      ed.on('update', () => {
        emit('update:editor', ed)
      })
    }
  })

  watch(() => props.disabled, (editorDisabled) => {
    if (editor.value) {
      editor.value.setEditable(!editorDisabled)
    }
  })

  function setTextType(newType: string) {
    if (!editor.value) return

    if (newType === "paragraph") {
      editor.value.chain().focus().setParagraph().run()
    } else if (newType === "heading-1") {
      editor.value.chain().focus().setHeading({ level: 1 }).run()
    } else if (newType === "heading-2") {
      editor.value.chain().focus().setHeading({ level: 2 }).run()
    } else if (newType === "heading-3") {
      editor.value.chain().focus().setHeading({ level: 3 }).run()
    }
  }

  function setTextColor(hexColor: string) {
    if (!editor.value) return

    editor.value.chain().focus().setColor(hexColor).run()
    color.value = hexColor
  }
</script>

<template>
  <UEditor
    ref="editorRef"
    :model-value="props.modelValue"
    :editable="!props.disabled"
    :extensions="extensions"
    :ui="{
      root: 'ring ring-inset ring-accented rounded-xl p-4 space-y-2',
      content: 'prose dark:prose-invert focus:outline-none py-2 rounded-md border border-gray-300 bg-white dark:bg-gray-900 overflow-y-auto max-h-72',
      base: 'min-h-[200px] p-0 focus:outline-none !px-3'
    }"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #default="{ editor: slotEditor }">
      <div v-if="slotEditor" class="flex flex-wrap gap-2 mb-2">
        <UButton icon="i-heroicons-arrow-uturn-left" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().undo().run()" />
        <UButton icon="i-heroicons-arrow-uturn-right" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().redo().run()" />

        <USeparator orientation="vertical" color="primary" class="h-6 mx-1" />

        <USelect
          v-model="selectedTextType"
          :items="textTypes"
          class="w-32"
          variant="outline"
          :disabled="props.disabled"
          @update:model-value="setTextType"
        />

        <UPopover>
          <UButton variant="ghost" size="sm" :disabled="props.disabled">
            <span :style="chip" class="size-3 rounded-full" />
          </UButton>

          <template #content>
            <UTooltip
              v-for="(c, index) in colors"
              :key="index"
              :text="c.name"
            >
              <UButton variant="ghost" @click="setTextColor(c.hex)">
                <span :style="{ backgroundColor: c.hex }" class="size-3 rounded-full"/>
              </UButton>
            </UTooltip>

            <UTooltip text="Autre couleur">
              <input
                type="color"
                :value="slotEditor.getAttributes('textStyle').color"
                class="w-4 h-4 rounded-full"
                @input="setTextColor($event.target.value)" >
            </UTooltip>
          </template>
        </UPopover>

        <USeparator orientation="vertical" color="primary" class="h-6 mx-1" />

        <UButton icon="i-heroicons-bold" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().toggleBold().run()" />
        <UButton icon="i-heroicons-italic" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().toggleItalic().run()" />
        <UButton icon="i-heroicons-underline" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().toggleUnderline().run()" />
        <UButton icon="i-heroicons-strikethrough" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().toggleStrike().run()" />

        <USeparator orientation="vertical" color="primary" class="h-6 mx-1" />

        <UButton icon="i-heroicons-list-bullet" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().toggleBulletList().run()" />
        <UButton icon="i-heroicons-numbered-list" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().toggleOrderedList().run()" />

        <USeparator orientation="vertical" color="primary" class="h-6 mx-1" />

        <UButton icon="i-heroicons-bars-3-bottom-left" color="primary" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().setTextAlign('left').run()" />
        <UButton icon="i-heroicons-bars-3" color="primary" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().setTextAlign('center').run()" />
        <UButton icon="i-heroicons-bars-3-bottom-right" color="primary" size="sm" :disabled="props.disabled" @click="slotEditor.chain().focus().setTextAlign('right').run()" />
      </div>
    </template>
  </UEditor>
</template>

<style scoped>
:deep(.ProseMirror-focused) {
  outline: none;
}


:deep(.ProseMirror ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
}

:deep(.ProseMirror ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
}

:deep(.ProseMirror li) {
  margin-bottom: 0.25rem;
}

:deep(.ProseMirror a) {
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
}

:deep(.ProseMirror a:hover) {
  text-decoration: underline dotted;
}

:deep(.ProseMirror h1) {
	font-size: 2rem;
	font-weight: bold;
	margin-bottom: 0.5rem;
}

:deep(.ProseMirror h2) {
	font-size: 1.5rem;
	font-weight: bold;
	margin-bottom: 0.4rem;
}

:deep(.ProseMirror h3) {
	font-size: 1.2rem;
	font-weight: bold;
	margin-bottom: 0.3rem;
}

:deep(.ProseMirror p) {
  margin-top: 0;
  margin-bottom: 0;
}
</style>
