import {usePut} from "~/composables/api/api";
import type {Item} from "~/types/api/item";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";

export abstract class AbstractSortableQuery<R, W> extends AbstractClubDependentQuery<R, W> {

  async move(item: Item, direction: string) {
    return usePut(item["@id"] + "/move", {direction: direction});
  }

  async reorder(uuids: string[]) {
    return usePut(this.getRootUrl() + "/-/reorder", {uuids: uuids});
  }
}
