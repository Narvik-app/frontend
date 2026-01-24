import type {UuidItem} from "~/types/api/uuidItem";
import type {TimestampItem} from "~/types/api/timestampItem";
import type {ClubSetting} from "~/types/api/item/clubDependent/clubSetting";
import type {SelectMenuItem} from "#ui/types";

export enum ClubActivity {
  Generic = 'GENERIC',

  SPORT_OTHER = 'SPORT_OTHER',
  SPORT_FFTIR = 'SPORT_FFTIR',
}

export function getSelectMenuClubActivity(): SelectMenuItem[] {
  return [
    {
      type: 'label',
      label: 'Non sportive'
    },
    {
      label: 'Global',
      value: ClubActivity.Generic
    },

    {
      type: 'separator'
    },
    {
      type: 'label',
      label: 'Sportive'
    },

    {
      label: 'Autre sport',
      value: ClubActivity.SPORT_OTHER
    },
    {
      label: 'FFTIR - Tir sportif',
      value: ClubActivity.SPORT_FFTIR
    }
  ]
}
export function clubHasControlActivity(activity: ClubActivity|undefined): boolean {
  if (!activity) return false
  return [ClubActivity.Generic, ClubActivity.SPORT_FFTIR].includes(activity)
}

export enum ClubRole {
  Badger = 'CLUB_BADGER',

  Member = 'CLUB_MEMBER',
  Supervisor = 'CLUB_SUPERVISOR',
  Admin = 'CLUB_ADMIN'
}

export function getAvailableClubRoles() {
  return [
    {
      text:  'Administrateur',
      value: ClubRole.Admin
    },
    {
      text:  'Bénévole / Superviseur',
      value: ClubRole.Supervisor
    },
    {
      text:  'Membre',
      value: ClubRole.Member
    },
  ]
}
export function getAvailableClubRole(role: ClubRole) {
  return getAvailableClubRoles().find((rolef) => rolef.value === role) ?? { text: 'Non trouvé', value: ClubRole.Member }
}

export function isClubAdmin(role: ClubRole|undefined): boolean {
  if (!role) return false
  return role === ClubRole.Admin
}
export function hasClubSupervisorRole(role: ClubRole|undefined): boolean {
  if (!role) return false
  return role === ClubRole.Supervisor || isClubAdmin(role)
}

// Club plugin types that can be enabled/disabled per club
export type ClubPlugin = 'presencesEnabled' | 'salesEnabled';

// Plugin metadata for UI display
export interface ClubPluginInfo {
  key: ClubPlugin;
  label: string;
  description?: string;
}

export const clubPlugins: ClubPluginInfo[] = [
  { key: 'presencesEnabled', label: 'Présences', description: 'Enregistrement des présences' },
  { key: 'salesEnabled', label: 'Ventes', description: 'Ventes et gestion des stocks' },
];

interface _Club extends UuidItem, TimestampItem {
  name?: string;
  isActivated?: boolean
  presencesEnabled?: boolean
  salesEnabled?: boolean
  badgerToken?: string
  comment?: string
  settings?: ClubSetting
  renewDate?: Date|null
  deletionDate?: Date|null
  address?: string
  zipCode?: number
  city?: string
  siret?: string
  vat?: string
  website?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  currentMonthEmailsSent?: number
  maxMonthlyEmails?: number
}

export interface Club extends _Club {
  name: string;
  isActivated: boolean
  presencesEnabled: boolean
  salesEnabled: boolean

  settings: ClubSetting
}

export interface WriteClub extends _Club {
  name: string;
  isActivated: boolean
  presencesEnabled: boolean
  salesEnabled: boolean
}

export interface SelfWriteClub extends _Club {

}
