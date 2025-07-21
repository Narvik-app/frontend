import {useDelete, useFetchItem, usePatch, usePost, usePostRawJson, usePut} from "~/composables/api/api";
import {AbstractQuery} from "~/composables/api/query/AbstractQuery";
import type {User} from "~/types/api/item/user";

export interface UserRegister {
  accountType: string,
  securityCode: string,
  email: string,
  password?: string,
  firstname?: string,
  lastname?: string,

  clubActivity?: string,
  clubName?: string,
  clubEmail?: string,
  clubPhone?: string,
  clubAddress?: string,
  clubZipCode?: number,
  clubCity?: string,
  clubSiret?: string,
  clubVat?: string
}

export default class UserQuery extends AbstractQuery<User, User> {
  rootPath = "users";

  async registerInitialise(accountType: string, email: string, turnstileToken: string|undefined = undefined) {
    return usePostRawJson(`${this.rootPath}/-/initiate-register`, {
      accountType: accountType,
      email: email,
      token: turnstileToken
    });
  }

  async register(userRegister: UserRegister) {
    return usePostRawJson(`${this.rootPath}/-/register`, {
      securityCode: userRegister.securityCode.trim().toUpperCase(),
      accountType: userRegister.accountType,

      email: userRegister.email,
      password: userRegister.password,
      firstname: userRegister.firstname,
      lastname: userRegister.lastname,

      clubActivity: userRegister.clubActivity,
      clubName: userRegister.clubName,
      clubEmail: userRegister.clubEmail,
      clubPhone: userRegister.clubPhone,
      clubAddress: userRegister.clubAddress,
      clubZipCode: userRegister.clubZipCode,
      clubCity: userRegister.clubCity,
      clubSiret: userRegister.clubSiret,
      clubVat: userRegister.clubVat,
    });
  }

  async passwordResetInitialise(email: string, turnstileToken: string|undefined = undefined) {
    return usePostRawJson(`${this.rootPath}/-/initiate-reset-password`, {
      email: email,
      token: turnstileToken
    });
  }

  async passwordReset(email: string, password: string, securityCode: string) {
    return usePostRawJson(`${this.rootPath}/-/reset-password`, {
      email: email,
      password: password,
      securityCode: securityCode.trim().toUpperCase()
    });
  }

  async self() {
    return useFetchItem<User>('/self');
  }

  async selfLegalsAccepted() {
    return usePatch('/self/legals-accepted', { });
  }

  async selfUpdatePassword(currentPassword: string, newPassword: string) {
    return usePut('/self/update-password', {current: currentPassword, new: newPassword});
  }

  async selfDelete() {
    return useDelete('/self');
  }

  async getBadgerQuickLoginInfo(securityCode: string, turnstileToken: string|undefined = undefined) {
    return usePost('/auth/quick-login/bdg', { securityCode: securityCode, cf_token: turnstileToken }, false)
  }

}
