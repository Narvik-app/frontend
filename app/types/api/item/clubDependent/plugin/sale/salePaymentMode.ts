import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";

export interface SalePaymentMode extends UuidItem, ClubLinkedItem {
  name?: string;
  icon?: string;
  available?: boolean;
  weight?: number;
  kind?: 'payment' | 'stock_removal';
}
