export interface SaleStatsPaymentMode {
  uuid: string;
  name: string;
  icon: string | null;
  kind: string;
  count: number;
  amount: number;
}

export interface SalePerItemStat {
  category: string | null;
  itemName: string;
  paymentModeName: string;
  count: number;
  amount: number;
}
