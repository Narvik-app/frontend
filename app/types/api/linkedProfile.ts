import type {Club} from "~/types/api/item/club";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {Permission} from "~/types/api/permissions";

export interface LinkedProfile {
  id: string;
  displayName: string;

  club: Club;
  member?: Member;
  role: string;
  permissions?: Permission[];
}

