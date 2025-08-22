import type { Email } from "~/types/api/item/clubDependent/plugin/emailing/email";
import { AbstractClubDependentQuery } from "~/composables/api/query/AbstractClubDependentQuery";
import { useUploadFile } from "~/composables/api/api";

export default class EmailQuery extends AbstractClubDependentQuery<Email, Email> {
    rootPath = "emails";

    async sendEmail(payload: FormData) {
        return useUploadFile(`${this.getRootUrl()}/-/send`, payload)
    }
}