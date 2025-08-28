import type { EmailTemplate } from "~/types/api/item/clubDependent/plugin/emailing/emailTemplate";
import { AbstractClubDependentQuery } from "../../../AbstractClubDependentQuery";
import { usePatch } from "~/composables/api/api";

export default class EmailTemplateQuery extends AbstractClubDependentQuery<EmailTemplate, EmailTemplate> {
  rootPath = "email-templates"

  async update(uuid: string, template: EmailTemplate) {
    return usePatch(`${this.getRootUrl()}/${uuid}`, template)
  }
}