import type {Item} from "../item";

export interface Metric extends Item {
  name: string;
  value?: number;
  values?: object;
  childMetrics: Metric[]
  pagination?: {
    currentPage: number,
    itemsPerPage: number,
    totalItems: number,
    totalPages: number,
    order: string
  }
}
