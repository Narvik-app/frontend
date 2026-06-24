import type {Loan} from '~/types/api/item/clubDependent/plugin/loan/loan'
import {AbstractClubDependentQuery} from '~/composables/api/query/AbstractClubDependentQuery'

export default class LoanQuery extends AbstractClubDependentQuery<Loan, Loan> {
  rootPath = 'loans'
}
