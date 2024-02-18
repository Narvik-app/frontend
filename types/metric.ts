import type { Item } from "./item";

export interface Metric extends Item {
  name: string;
  value: number;
  childMetrics: Metric[]
}
