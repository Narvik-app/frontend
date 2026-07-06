import type {UuidItem} from '~/types/api/uuidItem'
import type {ClubLinkedItem} from '~/types/api/clubLinkedItem'

export interface LoanRecordingType extends UuidItem, ClubLinkedItem {
  name?: string
  /** Hex color, e.g. #3b82f6 */
  color?: string | null
}
