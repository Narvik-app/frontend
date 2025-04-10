import type {ExternalPresence} from "~/types/api/item/clubDependent/plugin/presence/externalPresence";
import ExternalPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/ExternalPresenceQuery";
import dayjs from "dayjs";
import {defineStore} from "pinia";
import type {DateRange} from "~/types/date";

export const usePresenceStore = defineStore('presence', () => {
	const selectedDate: Ref<Date|null> = ref(null)
	const selectedRange: Ref<DateRange|undefined> = ref({ start: dayjs().subtract(30, 'day').toDate(), end: new Date() })
	const searchQuery: Ref<string> = ref('')

	const totalExternal: Ref<number> = ref(0)
	const totalMembers: Ref<number> = ref(0)

	const list: Ref<ExternalPresence[] | undefined> = ref(undefined)

	async function refresh() {
		const externalPresenceQuery = new ExternalPresenceQuery();
		const { items } = await externalPresenceQuery.getPresentToday()
		if (items) {
			list.value = items
		}
	}

	function addItem(newItem: ExternalPresence) {
		if (list.value) {
			list.value.unshift(newItem)
		}
	}

	function updateItem(updatedItem: ExternalPresence) {
		const item: ExternalPresence | undefined = list.value?.find(
			(i) => i["@id"] === updatedItem["@id"]
		);

		if (!item) return;
		Object.assign(item, updatedItem);
	}

	function deleteItem(deletedItem: ExternalPresence) {
		list.value = list.value?.filter((item) => {
			return item["@id"] !== deletedItem["@id"]
		})
	}

	return {
		searchQuery,
		selectedDate,
		selectedRange,
		totalExternal,
		totalMembers,

		addItem,
		refresh,
		updateItem,
		deleteItem
	}
})
