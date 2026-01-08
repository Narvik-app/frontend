import type {Item} from "../item";

export interface Season extends Item {
  name?: string;
  memberSeasons?: any;
}
