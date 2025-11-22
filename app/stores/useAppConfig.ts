import type {Ref} from "vue";
import type {Config} from "~/types/api/item/config";
import FileQuery from "~/composables/api/query/FileQuery";
import ConfigQuery from "~/composables/api/query/ConfigQuery";
import {useSelfUserStore} from "~/stores/useSelfUser";
import type {ExposedFile} from "~/types/api/item/exposedFile";
import type {ConfigValue} from "~/types/api/configValue";
import {defineStore} from "pinia";
import {isDarkMode} from "~/utils/browser";

export const useAppConfigStore = defineStore('appConfig', () => {
	const config: Ref<Config | null> = ref(null)

	// Not exposed
	const logoImage: Ref<string> = ref('')
	const logoNk: Ref<string> = ref('')

  // Only initialize on client side
  if (import.meta.client) {
    setLogoImage(isDarkMode().value)
    setLogoNk(isDarkMode().value)

    watch(isDarkMode(), (value) => {
      setLogoImage(value)
      setLogoNk(value)
    })
  }

  function setLogoImage(isDark: boolean) {
    if (isDark) {
      logoImage.value = '/logo-narvik-white.png'
    } else {
      logoImage.value = '/logo-narvik.png'
    }
  }

  function setLogoNk(isDark: boolean) {
    if (isDark) {
      logoNk.value = '/logo-nk-white.png'
    } else {
      logoNk.value = '/logo-nk.png'
    }
  }

  async function refresh(requireLogin?: boolean) {
    const selfStore = useSelfUserStore()

    if (requireLogin == undefined) requireLogin = selfStore.isLogged()

    const configQuery = new ConfigQuery();
    const { retrieved } = await configQuery.get(requireLogin)
    if (retrieved) {
      config.value = retrieved
    }
  }

	function getLogo(): Ref<string> {
		return logoImage
	}
  function getLogoNk(): Ref<string> {
    return logoNk
  }

	return {
		config,

		refresh,
		getLogo,
		getLogoNk,
	}
})
