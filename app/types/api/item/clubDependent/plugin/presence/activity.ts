import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {ClubRole} from "~/types/api/item/club";

export interface Activity extends UuidItem, ClubLinkedItem {
  name: string;
  visibility?: ClubRole|null
  isEnabled: boolean;
  /** When true, the presence page prompts a time-and-travel declaration right after a presence is registered for this activity */
  promptTimeAndTravelDeclaration?: boolean;
  memberPresences?: MemberPresence[];
}
