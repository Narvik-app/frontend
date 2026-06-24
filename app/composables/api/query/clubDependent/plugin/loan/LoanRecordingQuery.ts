import type {LoanRecording} from '~/types/api/item/clubDependent/plugin/loan/loanRecording'
import {AbstractClubDependentQuery} from '~/composables/api/query/AbstractClubDependentQuery'

export default class LoanRecordingQuery extends AbstractClubDependentQuery<LoanRecording, LoanRecording> {
  rootPath = 'loan-recordings'
}
