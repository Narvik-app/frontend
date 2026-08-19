import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";

export type ClubJobKey = 'itac_import' | 'itac_secondary_import' | 'cerbere_import' | 'member_control_sync';
export type ClubJobStatus = 'in_progress' | 'finished' | 'failed';

export interface ClubJob extends UuidItem, ClubLinkedItem {
  key?: ClubJobKey;
  total?: number;
  remaining?: number;
  status?: ClubJobStatus;
  createdAt?: string;
  updatedAt?: string;
}
