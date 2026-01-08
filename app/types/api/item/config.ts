import type {Item} from "../item";
import type {ConfigValue} from "../configValue";

export interface Config extends Item {
  id: string;
  appVersion?: string;
  logo?: string;
  modules?: {[index: string]: ConfigValue};
}
