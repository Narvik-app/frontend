import type {Member} from "~/types/api/item/clubDependent/member";
import type {MemberPermission, MemberPermissionWrite} from "~/types/api/item/clubDependent/memberPermission";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import type {Permission} from "~/types/api/permissions";

export default class MemberPermissionQuery extends AbstractClubDependentQuery<MemberPermission, MemberPermissionWrite> {
  rootPath = "permissions";
  protected activeMember: Member;

  constructor(activeMember: Member) {
    super();
    this.activeMember = activeMember;
  }

  private getActiveMemberIri(): string {
    if (!this.activeMember["@id"]) throw new Error("Missing @id for defined member");
    return this.activeMember["@id"];
  }

  public override getRootUrl(): string {
    // We access permissions via the member subresource
    // /clubs/{clubUuid}/members/{memberUuid}/permissions
    return `${this.getActiveMemberIri()}/${this.rootPath}`;
  }

  /**
   * Add a permission to the member
   */
  async addPermission(permission: Permission) {
    const payload: MemberPermissionWrite = {
      member: this.getActiveMemberIri(),
      permission: permission,
    };
    return this.post(payload);
  }

  /**
   * Remove a permission from the member
   */
  async removePermission(permissionItem: MemberPermission) {
    return this.delete(permissionItem);
  }
}
