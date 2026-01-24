import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import type {TimestampItem} from "~/types/api/timestampItem";
import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";

interface _ExternalPresence extends UuidItem, ClubLinkedItem, TimestampItem {
  activities?: Array<Activity | string>;
  licence?: string;
  firstname: string;
  lastname: string;
  fullName: string;
  date?: string;
}

export interface ExternalPresence extends _ExternalPresence {
  activities?: Activity[];
}

export interface WriteExternalPresence extends _ExternalPresence {
  activities?: Array<Activity|string>
}
