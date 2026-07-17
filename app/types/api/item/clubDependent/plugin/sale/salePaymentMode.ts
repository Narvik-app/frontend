import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {SalePaymentTerminal} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";

export interface SalePaymentMode extends UuidItem, ClubLinkedItem {
  name?: string;
  icon?: string;
  available?: boolean;
  weight?: number;
  kind?: 'payment' | 'stock_removal';
  /** Read-only: the terminals (TPE) offered for this payment mode, configured on each terminal. */
  paymentTerminals?: SalePaymentTerminal[];
}
