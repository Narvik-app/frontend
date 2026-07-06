import type {Item} from "../item";

export interface Metric<TValues = unknown> extends Item {
  name: string;
  value?: number;
  values?: TValues;
  childMetrics: Metric<TValues>[]
  pagination?: {
    currentPage: number,
    itemsPerPage: number,
    totalItems: number,
    totalPages: number,
    order: string
  }
}
