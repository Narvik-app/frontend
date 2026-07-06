export async function loadImageBase64(fileQuery: {getFromUrl: (url: string) => Promise<{retrieved?: {base64?: string}}>}, image?: {privateThumbnailUrl?: string; privateUrl?: string} | null): Promise<string | undefined> {
  const imageUrl = image?.privateThumbnailUrl ?? image?.privateUrl
  if (!imageUrl) return undefined
  const {retrieved} = await fileQuery.getFromUrl(imageUrl)
  return retrieved?.base64
}

export function getFileFormDataFromUInputChangeEvent(event: Event | FileList): FormData | null {
  const file = getFileFromUInputChangeEvent(event)
  if (!file) return null;

  return getFormData(file);
}

export function displayFileErrorToast(description: string): void {
  const toast = useToast()
  toast.add({
    title: "Erreur lors de l'envoie du fichier",
    description: description,
    color: "error"
  })
}

export function displayFileSuccessToast(title: string = 'Fichier envoyé'): void {
  const toast = useToast()
  toast.add({
    title: title,
    color: "success"
  })
}

function getFileFromUInputChangeEvent(event: Event | FileList): File | null {
  let files: FileList;
  if (event instanceof FileList) {
    files = event;
  } else {
    files = event.target.files || event.dataTransfer.files;
  }

  if (files.length < 1) {
    return null;
  }

  return files.item(0);
}

function getFormData(file: File): FormData {
  const formData = new FormData()
  formData.append('file', file, file.name)
  return formData;
}
