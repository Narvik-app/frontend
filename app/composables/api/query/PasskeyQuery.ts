import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON
} from "@simplewebauthn/browser";
import {usePost, usePostRawJson} from "~/composables/api/api";
import {AbstractQuery} from "~/composables/api/query/AbstractQuery";
import type {WebauthnCredential, WebauthnOptions} from "~/types/api/item/webauthnCredential";

export default class PasskeyQuery extends AbstractQuery<WebauthnCredential, WebauthnCredential> {
  rootPath = "self/passkeys";

  /** Start a registration for the logged user */
  async registrationOptions() {
    return usePost<WebauthnOptions<PublicKeyCredentialCreationOptionsJSON>>(`${this.rootPath}/-/options`, {})
  }

  /** Finish a registration with the browser response. The name is optional, the backend sets a default one. */
  async register(challengeId: string, credential: RegistrationResponseJSON, name?: string) {
    return usePost<WebauthnCredential>(this.rootPath, { challengeId, credential, name })
  }

  /** Public: start a passwordless login */
  async loginOptions() {
    const { data, error } = await usePostRawJson('public/passkeys/-/login-options', {})
    return {
      options: data as WebauthnOptions<PublicKeyCredentialRequestOptionsJSON> | undefined,
      error
    }
  }
}
