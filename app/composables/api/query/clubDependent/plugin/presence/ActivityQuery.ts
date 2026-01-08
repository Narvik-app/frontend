import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import {usePatch} from "~/composables/api/api";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";

export default class ActivityQuery extends AbstractClubDependentQuery<Activity, Activity> {
    rootPath = "activities";

    async mergeTo(id: string, target: string) {
        return usePatch(this.getRootUrl()  + '/' + id + '/merge', {
          target: target
        })
    }

}
