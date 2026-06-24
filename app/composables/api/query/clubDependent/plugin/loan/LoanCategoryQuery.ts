import type {LoanCategory} from '~/types/api/item/clubDependent/plugin/loan/loanCategory'
import {AbstractSortableQuery} from '~/composables/api/query/AbstractSortableQuery'

export default class LoanCategoryQuery extends AbstractSortableQuery<LoanCategory, LoanCategory> {
  rootPath = 'loan-categories'
}
