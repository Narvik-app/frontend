<script setup lang="ts">
import {Editor, EditorContent} from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import {Color, TextStyle} from '@tiptap/extension-text-style'

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

  const editor: Ref<Editor> = ref(
    new Editor({
      content: props.modelValue,
      extensions: [StarterKit, TextStyle, Color, TextAlign.configure({ types: ['heading', 'paragraph'] })],
      editable: !props.disabled,
      editorProps: {
        attributes: {
          class: 'min-h-[200px]'
        }
      },

      onCreate: ({editor}) => {
        emit('update:editor', editor)
      },
      onUpdate: ({editor}) => {
        emit('update:modelValue', editor.getHTML())
        emit('update:editor', editor)
      }
    })
  )

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

  onMounted(() => {
    if (!editor.value) return

    editor.value.on('selectionUpdate', () => {
      const newType = currentTextType.value
      if (newType !== selectedTextType.value) {
        selectedTextType.value = newType
      }

      const newColor = editor.value.getAttributes('textStyle').color || "#000000"
      if (newColor !== color.value) {
        color.value = newColor
      }
    })
  })

  onUnmounted(() => {
    editor.value.destroy()
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

  watch(() => props.modelValue, (newValue) => {
    if (newValue !== editor.value.getHTML()) {
      editor.value.commands.setContent(newValue)
    }
  })

  watch(() => props.disabled, (editorDisabled) => {
    editor.value.setEditable(!editorDisabled)
  })
</script>

<template>
  <div class="ring ring-inset ring-accented rounded-xl p-4 space-y-2">
    <div class="flex flex-wrap gap-2 mb-2">
      <UButton icon="i-heroicons-arrow-uturn-left" size="sm" :disabled="props.disabled" @click="editor.chain().focus().undo().run()" />
      <UButton icon="i-heroicons-arrow-uturn-right" size="sm" :disabled="props.disabled" @click="editor.chain().focus().redo().run()" />

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
            v-for="(color, index) in colors"
            :key="index"
            :text="color.name"
          >
            <UButton variant="ghost" @click="setTextColor(color.hex)">
              <span :style="{ backgroundColor: color.hex }" class="size-3 rounded-full"/>
            </UButton>
          </UTooltip>

          <UTooltip text="Autre couleur">
            <input
              type="color"
              :value="editor.getAttributes('textStyle').color"
              class="w-4 h-4 rouded-full"
              @input="setTextColor($event.target.value)" >
          </UTooltip>
        </template>
      </UPopover>

      <USeparator orientation="vertical" color="primary" class="h-6 mx-1" />

      <UButton icon="i-heroicons-bold" size="sm" :disabled="props.disabled" @click="editor.chain().focus().toggleBold().run()" />
      <UButton icon="i-heroicons-italic" size="sm" :disabled="props.disabled" @click="editor.chain().focus().toggleItalic().run()" />
      <UButton icon="i-heroicons-underline" size="sm" :disabled="props.disabled" @click="editor.chain().focus().toggleUnderline().run()" />
      <UButton icon="i-heroicons-strikethrough" size="sm" :disabled="props.disabled" @click="editor.chain().focus().toggleStrike().run()" />

      <USeparator orientation="vertical" color="primary" class="h-6 mx-1" />

      <UButton icon="i-heroicons-list-bullet" size="sm" :disabled="props.disabled" @click="editor.chain().focus().toggleBulletList().run()" />
      <UButton icon="i-heroicons-numbered-list" size="sm" :disabled="props.disabled" @click="editor.chain().focus().toggleOrderedList().run()" />

      <USeparator orientation="vertical" color="primary" class="h-6 mx-1" />

      <UButton icon="i-heroicons-bars-3-bottom-left" color="primary" size="sm" :disabled="props.disabled" @click="editor.chain().focus().setTextAlign('left').run()" />
      <UButton icon="i-heroicons-bars-3" color="primary" size="sm" :disabled="props.disabled" @click="editor.chain().focus().setTextAlign('center').run()" />
      <UButton icon="i-heroicons-bars-3-bottom-right" color="primary" size="sm" :disabled="props.disabled" @click="editor.chain().focus().setTextAlign('right').run()" />
    </div>

    <EditorContent
      :editor="editor"
      class="prose dark:prose-invert focus:outline-none px-3 py-2 rounded-md border border-gray-300 bg-white dark:bg-gray-900 overflow-y-auto max-h-72"
    />
  </div>
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
</style>
