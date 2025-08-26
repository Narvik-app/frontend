import type { ClubLinkedItem } from "~/types/api/clubLinkedItem";
import type { UuidItem } from "~/types/api/uuidItem";
import type { TimestampItem } from "~/types/api/timestampItem";

export interface EmailTemplate extends UuidItem, ClubLinkedItem, TimestampItem {
  isNewsletter?: boolean;
  title?: string;
  content?: string;
}
