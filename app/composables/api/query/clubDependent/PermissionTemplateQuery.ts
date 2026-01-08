import type { PermissionTemplate, PermissionTemplateWrite, PermissionTemplateUpdate } from "~/types/api/item/clubDependent/permissionTemplate";
import type { MemberPermission, TemplatePermissionWrite } from "~/types/api/item/clubDependent/memberPermission";
import { AbstractClubDependentQuery } from "~/composables/api/query/AbstractClubDependentQuery";
import { usePost, useDelete, useFetchList } from "~/composables/api/api";
import type { Permission } from "~/types/api/permissions";
import type { Item } from "~/types/api/item";

export default class PermissionTemplateQuery extends AbstractClubDependentQuery<PermissionTemplate, PermissionTemplateWrite> {
  rootPath = "permission-templates";

  /**
   * Create a new permission template
   */
  async createTemplate(name: string, clubIri: string): Promise<PermissionTemplate | undefined> {
    const payload: PermissionTemplateWrite = {
      club: clubIri,
      name: name,
    };
    return (await this.post(payload)).created;
  }

  /**
   * Update a permission template name
   */
  async updateTemplate(template: PermissionTemplate, name: string): Promise<PermissionTemplate | undefined> {
    const payload: PermissionTemplateUpdate = { name };
    return (await this.patch(template, payload as unknown as Item)).updated;
  }

  /**
   * Delete a permission template
   */
  async deleteTemplate(template: PermissionTemplate): Promise<void> {
    await this.delete(template);
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
  async addPermission(template: PermissionTemplate, permission: Permission): Promise<MemberPermission | undefined> {
    const payload: TemplatePermissionWrite = {
      template: template["@id"]!,
      permission: permission,
    };
    return (await usePost<MemberPermission>(this.getTemplatePermissionsUrl(template), payload)).item;
  }

  /**
   * Remove a permission from the template
   */
  async removePermission(template: PermissionTemplate, permissionItem: MemberPermission): Promise<void> {
    await this.delete(permissionItem);
  }

  /**
   * Get all permissions for a template
   */
  async getTemplatePermissions(template: PermissionTemplate): Promise<MemberPermission[]> {
    const response = await useFetchList<MemberPermission>(this.getTemplatePermissionsUrl(template));
    return response.items;
  }
}
