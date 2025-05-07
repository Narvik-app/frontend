import type {UuidItem} from "~/types/api/uuidItem";
import type {TimestampItem} from "~/types/api/timestampItem";
import type {ClubSetting} from "~/types/api/item/clubDependent/clubSetting";
import type {SelectMenuItem} from "#ui/types";

export enum ClubActivity {
  Generic = 'GENERIC',

  FFTIR = 'FFTIR',
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
      label: 'FFTIR - Tir sportif',
      value: ClubActivity.FFTIR
    }
  ]
}
export function clubHasControlActivity(activity: ClubActivity|undefined): boolean {
  if (!activity) return false
  return [ClubActivity.Generic, ClubActivity.FFTIR].includes(activity)
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
      text:  'Administateur',
      value: ClubRole.Admin
    },
    {
      text:  'Superviseur/Permanent',
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

interface _Club extends UuidItem, TimestampItem {
  name: string;
  isActivated: boolean
  salesEnabled: boolean
  badgerToken?: string
  comment?: string
  settings?: ClubSetting
  renewDate?: Date|null
  address?: string
  zipCode?: number
  city?: string
  siret?: string
  vat?: string
  website?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
}

export interface Club extends _Club {
  settings: ClubSetting
}

export interface WriteClub extends _Club {

}
