import type {LoanRecordingType} from '~/types/api/item/clubDependent/plugin/loan/loanRecordingType'
import {AbstractClubDependentQuery} from '~/composables/api/query/AbstractClubDependentQuery'

export default class LoanRecordingTypeQuery extends AbstractClubDependentQuery<LoanRecordingType, LoanRecordingType> {
  rootPath = 'loan-recording-types'
}
