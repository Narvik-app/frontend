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
  // Some settings (e.g. SMTP_PASSWORD) never return their value, even
  // encrypted; hasValue lets the UI know one is configured anyway.
  hasValue?: boolean;
}
