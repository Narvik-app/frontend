import {AbstractQuery} from "~/composables/api/query/AbstractQuery";
import type {MileageRate} from "~/types/api/item/clubDependent/plugin/timeAndTravel/mileageRate";

export default class MileageRateQuery extends AbstractQuery<MileageRate, MileageRate> {
  rootPath = "mileage-rates";
}
