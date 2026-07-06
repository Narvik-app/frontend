import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {LoanRecordingType} from '~/types/api/item/clubDependent/plugin/loan/loanRecordingType'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {UuidItem} from '~/types/api/uuidItem'
import type {ClubLinkedItem} from '~/types/api/clubLinkedItem'
import type {TimestampItem} from '~/types/api/timestampItem'

export interface LoanRecording extends UuidItem, ClubLinkedItem, TimestampItem {
  loanItem?: LoanItem | string | null
  description?: string | null
  recordingType?: LoanRecordingType | string | null
  /** The supervisor/admin who performed the action */
  author?: Member | string | null
  date?: string
}
