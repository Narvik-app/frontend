import type {Item} from "../item";
import type {MemberSeason} from "./clubDependent/memberSeason";

export interface Season extends Item {
  name?: string;
  memberSeasons?: MemberSeason[];
}
