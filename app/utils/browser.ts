export function verifyCameraIsPresent(): Ref<boolean> {
  const isCameraPresent = ref(false)
  
  if (import.meta.client && navigator?.mediaDevices) {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      devices.forEach(device => {
        if (device.kind === 'videoinput') {
          isCameraPresent.value = true
        }
      })
    })
  }

  return isCameraPresent
}

export function extractDataFromBase64Encoded(base64: string) {
  const split = base64.split(',')
  return split[1] ?? split[0] ?? ''
}

export function base64ToBlob(base64: string, type = "application/octet-stream" ) {
  const data = extractDataFromBase64Encoded(base64)

  const binStr = atob( data );
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[ i ] = binStr.charCodeAt( i );
  }
  return new Blob( [ arr ], { type: type } );
}

function createBrowserDownload(filename: string, blob: Blob) {
  if (import.meta.server) return
  
  const elem = window.document.createElement('a')
  elem.href = window.URL.createObjectURL(blob)
  elem.download = filename
  document.body.appendChild(elem)
  elem.click()
  document.body.removeChild(elem)
}

export function createBrowserCsvDownload(filename: string, data: any) {
  const blob = new Blob([data], {type: 'text/csv'})
  createBrowserDownload(filename, blob)
}

export function createBrowserPdfDownload(filename: string, base64: string) {
  const blob = base64ToBlob(base64, 'application/pdf')
  createBrowserDownload(filename, blob)
}

/**
 * Detecting if the device is tactile.
 * Mainly use to "fix" the nuxt ui bug on UDropdownMenu.
 * The bug should be fixed in nuxt ui v3
 */
export function isTouchDevice() {
  if (import.meta.server) return false
  
  return (('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0));
}

export const activeBreakpoint: Ref<string|undefined> = ref(undefined)
export function watchBreakpoint() {
  if (import.meta.server) return
  
  if (window.screen.width >= 1536) {
    activeBreakpoint.value = '2xl'
  } else if (window.screen.width >= 1280) {
    activeBreakpoint.value = 'xl'
  } else if (window.screen.width >= 1024) {
    activeBreakpoint.value = 'lg'
  } else if (window.screen.width >= 768) {
    activeBreakpoint.value = 'md'
  } else if (window.screen.width >= 640) {
    activeBreakpoint.value = 'sm'
  } else {
    activeBreakpoint.value = 'xs'
  }
}

function checkIsDevice(deviceSizes: Array<string>) {
  return computed(() => {
    if (activeBreakpoint.value === undefined) {
      return false
    }
    return deviceSizes.includes(activeBreakpoint.value)
  })
}

export function isMobile() {
  return checkIsDevice(['xs', 'sm', 'md'])
}

export function isTablet() {
  return checkIsDevice(['lg'])
}

export function isDesktop() {
  return checkIsDevice(['2xl', 'xl'])
}

export function isDarkMode() {
  const colorMode = useColorMode()
  return computed({
    get() {
      return colorMode.value === 'dark'
    },
    set(dark: boolean|undefined = undefined) {
      if (dark === undefined) {
        colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
      } else {
        colorMode.preference = dark ? 'dark' : 'light'
      }
    }
  });
}

/**
 * We create a function that call window.print...
 * Otherwise directly in the vue file we got a _ctxt error (window not exist)
 */
export function print() {
  if (import.meta.server) return
  window.print()
}
