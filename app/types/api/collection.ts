import type {View} from "./view";

export interface PagedCollection<T> {
  "@context"?: string;
  "@id"?: string;
  "@type"?: string;
  "member": T[];
  "search"?: object;
  "totalItems"?: number;
  "view": View;
}
