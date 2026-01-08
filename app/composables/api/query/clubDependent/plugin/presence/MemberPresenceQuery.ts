import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import type {FetchAllData} from "~/types/api/api";
import {useFetchList, usePost, useUploadFile} from "~/composables/api/api";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";

export default class MemberPresenceQuery extends AbstractClubDependentQuery<MemberPresence, MemberPresence> {
    rootPath = "member-presences";

    async getPresentToday(): Promise<FetchAllData<MemberPresence>> {
        return useFetchList<MemberPresence>(this.getRootUrl() + "/-/today");
    }

    async importFromCerbere(formData: FormData) {
        return useUploadFile(this.getRootUrl() + "/-/from-cerbere", formData)
    }

    async importFromExternalPresences() {
        return usePost(`${this.getRootUrl()}/-/import-from-external-presences`, {});
    }

    async importFromCsv(formData: FormData) {
        return useUploadFile(this.getRootUrl() + "/-/from-csv", formData)
    }
}
