import type {MemberSeason} from "~/types/api/item/clubDependent/memberSeason";
import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {ClubRole} from "~/types/api/item/club";
import type {File} from "~/types/api/item/file";

export interface Member extends UuidItem, ClubLinkedItem {
  profileImage?: File;
  profileImageBase64?: string;
  lastControlShooting?: Date;
  currentSeason?: MemberSeason;
  plainPassword?: string;

  role?: ClubRole
  linkedEmail?: string

  medicalCertificateExpiration?: Date|null;
  medicalCertificateStatus?: string
  clubNewsletter?: boolean

  email?: string;
  licence?: string;
  firstname?: string;
  lastname?: string;
  fullName?: string;
  gender?: string;
  birthday?: Date;
  blacklisted?: boolean;
  postal1?: string;
  postal2?: string;
  postal3?: string;
  zipCode?: number;
  city?: string;
  country?: string;
  phone?: string;
  mobilePhone?: string;
}
