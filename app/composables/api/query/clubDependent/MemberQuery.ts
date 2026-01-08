import type {Member} from "~/types/api/item/clubDependent/member";
import {useFetchList, useGetCsv, usePatch, usePost, useUploadFile} from "~/composables/api/api";
import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import type {MemberSeason} from "~/types/api/item/clubDependent/memberSeason";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import type {ClubRole} from "~/types/api/item/club";

export default class MemberQuery extends AbstractClubDependentQuery<Member, Member> {
  rootPath = "members";

  async updateRole(member: Member, role: ClubRole) {
    let payload: Member = {
      role: role
    }

    return usePatch<Member>(`${member["@id"]}/role`, payload)
  }

  async linkWithUser(member: Member, email: String) {
    let payload = {
      email: email
    }

    return usePatch(`${member["@id"]}/link`, payload)
  }

  async search(query: string) {
    return usePost<Member[]>(`${this.getRootUrl()}/-/search`, {query: query});
  }

  async importFromEden(formData: FormData) {
    return useUploadFile(this.getRootUrl() + "/-/from-eden", formData)
  }

  async importFromItac(formData: FormData) {
    return useUploadFile(this.getRootUrl() + "/-/from-itac", formData)
  }

  async importFromItacSecondary(formData: FormData) {
    return useUploadFile(this.getRootUrl() + "/-/secondary-from-itac", formData)
  }

  async importPhotosFromItac(formData: FormData) {
    return useUploadFile(this.getRootUrl() + "/-/photos-from-itac", formData)
  }

  async seasons(id: string, urlParams?: URLSearchParams) {
    let url = `${this.getRootUrl()}/${id}/seasons`;

    if (!urlParams) {
      urlParams = new URLSearchParams()
    }

    url += '?' + urlParams.toString()

    return useFetchList<MemberSeason>(url)
  }

  async presences(id: string, urlParams?: URLSearchParams) {
    let url = `${this.getRootUrl()}/${id}/presences`;

    if (!urlParams) {
      urlParams = new URLSearchParams()
    }
    if (!urlParams.has('pagination')) {
      urlParams.append('pagination', 'false')
    }

    url += '?' + urlParams.toString()

    return useFetchList<MemberPresence>(url)
  }

  async presencesCsv(id: string, urlParams?: URLSearchParams) {
    let url = `${this.getRootUrl()}/${id}/presences.csv`;

    if (!urlParams) {
      urlParams = new URLSearchParams()
    }
    if (!urlParams.has('pagination')) {
      urlParams.append('pagination', 'false')
    }

    url += '?' + urlParams.toString()

    return useGetCsv(url)
  }
}
