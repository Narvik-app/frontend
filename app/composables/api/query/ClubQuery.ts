import {useFetchItem, usePatch} from "~/composables/api/api";
import type {Club, WriteClub} from "~/types/api/item/club";
import {AbstractQuery} from "~/composables/api/query/AbstractQuery";

export default class ClubQuery extends AbstractQuery<Club, WriteClub> {
  rootPath = "clubs";

  async getCurrentClub(useCache: boolean = false) {
    return useFetchItem<Club>(this.getCurrentClubPath(), useCache, true);
  }

  async generateBadger() {
    return usePatch<Club>(`${this.getCurrentClubPath()}/generate-badger`, {})
  }

  async getBadgerQuickLogin() {
    return useFetchItem(`${this.getCurrentClubPath()}/badger-quick-login`, false, true);
  }

  async programDeletion() {
    return usePatch<Club>(`${this.getCurrentClubPath()}/delete`, {})
  }
}
