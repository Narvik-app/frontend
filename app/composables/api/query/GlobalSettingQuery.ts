import {AbstractQuery} from "~/composables/api/query/AbstractQuery";
import {type GlobalSetting, GlobalSettingPublicEnum} from "~/types/api/item/globalSetting";
import {useFetchItem, usePost, useUploadFile} from "~/composables/api/api";
import type {SmtpConfig} from "~/types/api/smtp";
import dayjs from "dayjs";
import type {ClubSetting} from "~/types/api/item/clubDependent/clubSetting";

export default class GlobalSettingQuery extends AbstractQuery<GlobalSetting, GlobalSetting> {
  rootPath = "global-settings";

  async importLogo(formData: FormData) {
    return useUploadFile(this.rootPath + "/-/logo", formData)
  }

  async getPublic(id: GlobalSettingPublicEnum, useCache: boolean = false) {
    return useFetchItem<GlobalSetting>(`public/${this.rootPath}/${id}`, useCache, false);
  }

  async updateLegals(date: Date) {
    return usePost(this.rootPath + "/-/legals", { date: dayjs(date).format('YYYY-MM-DD') })
  }

  async updateLegalsFile(formData: FormData) {
    return useUploadFile(this.rootPath + "/-/legals-file", formData)
  }

  async updateSmtpConfig(config: SmtpConfig) {
    return usePost(this.rootPath + "/-/smtp", config)
  }

  async testSmtp(email: string) {
    return usePost(this.rootPath + "/-/test-email", {to: email})
  }
}
