import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";

export type ClubJobKey = 'import_itac' | 'import_itac_secondary' | 'import_cerbere' | 'member_control_sync';
export type ClubJobStatus = 'in_progress' | 'finished' | 'failed';

export interface ClubJob extends UuidItem, ClubLinkedItem {
  key?: ClubJobKey;
  total?: number;
  remaining?: number;
  status?: ClubJobStatus;
  createdAt?: string;
  updatedAt?: string;
}
