import type {ExternalPresence} from "~/types/api/item/clubDependent/plugin/presence/externalPresence";
import ExternalPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/ExternalPresenceQuery";
import dayjs from "dayjs";
import {defineStore} from "pinia";
import type {DateRangeFilter, DateRange} from "~/types/date";
import type {SelectApiItem} from "~/types/select";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";

export const usePresenceStore = defineStore('presence', () => {
  const selectedActivities: Ref<SelectApiItem<Activity>[]> = ref([])
  const selectedDate: Ref<Date|null> = ref(null)
	const selectedRange: Ref<DateRange|DateRangeFilter|undefined> = ref({ start: dayjs().subtract(30, 'day').toDate(), end: new Date() })
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

	function setSelectedRange(range: DateRange|DateRangeFilter|undefined) {
		selectedRange.value = range
	}

	return {
		searchQuery,
		selectedActivities,
		selectedDate,
		selectedRange,
		totalExternal,
		totalMembers,

		addItem,
		refresh,
		updateItem,
		deleteItem,
		setSelectedRange,
	}
})
