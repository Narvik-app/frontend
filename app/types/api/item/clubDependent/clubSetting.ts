import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import type {File} from "~/types/api/item/file";
import type {Season} from "~/types/api/item/season";
import type {ClubActivity} from "~/types/api/item/club";

interface _ClubSetting extends UuidItem, ClubLinkedItem {
  logo?: any
  logoBase64?: string
  activity?: ClubActivity
  controlShootingActivity?: any
  excludedActivitiesFromOpeningDays?: any
  seasonEnd?: string
  itacImportDate?: Date
  itacImportRemaining?: number
  itacSecondaryImportDate?: Date
  itacSecondaryImportRemaining?: number
  cerbereImportRemaining?: number,
  emailReplyTo?: string
}

export interface ClubSetting extends _ClubSetting {
  logo?: File
  controlShootingActivity?: Activity
  excludedActivitiesFromOpeningDays?: Activity[],
  currentSeason?: Season
}


export interface WriteClubSetting extends _ClubSetting {
  controlShootingActivity?: Activity|string|null
  excludedActivitiesFromOpeningDays?: Activity[]|string[]
}
