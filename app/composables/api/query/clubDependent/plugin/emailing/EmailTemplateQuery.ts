import type { EmailTemplate } from "~/types/api/item/clubDependent/plugin/emailing/emailTemplate";
import { AbstractClubDependentQuery } from "../../../AbstractClubDependentQuery";

export default class EmailTemplateQuery extends AbstractClubDependentQuery<EmailTemplate, EmailTemplate> {
  rootPath = "email-templates"
}