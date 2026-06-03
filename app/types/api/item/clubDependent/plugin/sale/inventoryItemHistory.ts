import type {InventoryItem} from "~/types/api/item/clubDependent/plugin/sale/inventoryItem";
import type {TimestampItem} from "~/types/api/timestampItem";
import type {UuidItem} from "~/types/api/uuidItem";

export interface InventoryItemHistory extends UuidItem, TimestampItem {
  item?: InventoryItem;

  purchasePrice?: string;
  sellingPrice?: string;
  quantity?: number | null;
}
