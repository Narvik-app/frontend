import type {
  PermissionTemplate,
  PermissionTemplateUpdate,
  PermissionTemplateWrite
} from "~/types/api/item/clubDependent/permissionTemplate";
import type {MemberPermission, TemplatePermissionWrite} from "~/types/api/item/clubDependent/memberPermission";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {useFetchList, usePost} from "~/composables/api/api";
import type {Permission} from "~/types/api/permissions";
import type {Item} from "~/types/api/item";

export default class PermissionTemplateQuery extends AbstractClubDependentQuery<PermissionTemplate, PermissionTemplateWrite> {
  rootPath = "permission-templates";

  /**
   * Create a new permission template
   */
  async createTemplate(name: string, clubIri: string) {
    const payload: PermissionTemplateWrite = {
      club: clubIri,
      name: name,
    };
    return this.post(payload);
  }

  /**
   * Update a permission template name
   */
  async updateTemplate(template: PermissionTemplate, name: string) {
    const payload: PermissionTemplateUpdate = { name };
    return this.patch(template, payload as unknown as Item);
  }

  /**
   * Delete a permission template
   */
  async deleteTemplate(template: PermissionTemplate) {
    return this.delete(template);
  }

  /**
   * Get permissions URL for a template
   */
  private getTemplatePermissionsUrl(template: PermissionTemplate): string {
    const clubPath = this.getCurrentClubPath();
    if (!template.uuid) throw new Error("Template UUID missing");
    return `${clubPath}/permission-templates/${template.uuid}/permissions`;
  }

  /**
   * Add a permission to the template
   */
  async addPermission(template: PermissionTemplate, permission: Permission) {
    const payload: TemplatePermissionWrite = {
      template: template["@id"]!,
      permission: permission,
    };
    const { item, error } = await usePost<MemberPermission>(this.getTemplatePermissionsUrl(template), payload);
    return { created: item, error };
  }

  /**
   * Remove a permission from the template
   */
  async removePermission(template: PermissionTemplate, permissionItem: MemberPermission) {
    return this.delete(permissionItem);
  }

  /**
   * Get all permissions for a template
   */
  async getTemplatePermissions(template: PermissionTemplate) {
    return useFetchList<MemberPermission>(this.getTemplatePermissionsUrl(template));
  }
}
