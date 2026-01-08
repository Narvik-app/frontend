import type {Item} from "../item";

export enum GlobalSettingPublicEnum {
  LEGALS_LAST_UPDATE = 'LEGALS_LAST_UPDATE',
  LEGALS_CGU = 'LEGALS_CGU',
  LEGALS_CGV = 'LEGALS_CGV',
  LEGALS_PRIVACY_POLICY = 'LEGALS_PRIVACY_POLICY',
}

export interface GlobalSetting extends Item {
  name?: string;
  value?: string;
}
