import type {ClubJob} from "~/types/api/item/clubDependent/clubJob";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";

export default class ClubJobQuery extends AbstractClubDependentQuery<ClubJob, ClubJob> {
  rootPath = "jobs";
}
