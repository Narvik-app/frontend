import type {UuidItem} from "~/types/api/uuidItem";
import type {TimestampItem} from "~/types/api/timestampItem";

export interface File extends UuidItem, TimestampItem {
  publicUrl?: string
  publicInlineUrl?: string
  privateUrl?: string
}
