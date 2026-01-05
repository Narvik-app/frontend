import type { PermissionTemplate, PermissionTemplateWrite, PermissionTemplateUpdate } from "~/types/api/item/clubDependent/permissionTemplate";
import type { MemberPermission, TemplatePermissionWrite } from "~/types/api/item/clubDependent/memberPermission";
import { AbstractClubDependentQuery } from "~/composables/api/query/AbstractClubDependentQuery";
import type { Permission } from "~/types/api/permissions";

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
    return this.post(payload);
  }

  /**
   * Update a permission template name
   */
  async updateTemplate(template: PermissionTemplate, name: string): Promise<PermissionTemplate | undefined> {
    const payload: PermissionTemplateUpdate = { name };
    return this.patch(template, payload);
  }

  /**
   * Delete a permission template
   */
  async deleteTemplate(template: PermissionTemplate): Promise<void> {
    return this.delete(template);
  }

  /**
   * Get permissions URL for a template
   */
  private getTemplatePermissionsUrl(template: PermissionTemplate): string {
    if (!template["@id"]) {
      throw new Error("Missing @id for template");
    }
    return `${template["@id"]}/permissions`;
  }

  /**
   * Add a permission to the template
   */
  async addPermission(template: PermissionTemplate, permission: Permission): Promise<MemberPermission | undefined> {
    const payload: TemplatePermissionWrite = {
      template: template["@id"]!,
      permission: permission,
    };
    return this.httpService.post<MemberPermission>(this.getTemplatePermissionsUrl(template), payload);
  }

  /**
   * Remove a permission from the template
   */
  async removePermission(template: PermissionTemplate, permissionItem: MemberPermission): Promise<void> {
    const url = `${this.getTemplatePermissionsUrl(template)}/${permissionItem.uuid}`;
    return this.httpService.delete(url);
  }

  /**
   * Get all permissions for a template
   */
  async getTemplatePermissions(template: PermissionTemplate): Promise<MemberPermission[]> {
    const response = await this.httpService.getCollection<MemberPermission>(this.getTemplatePermissionsUrl(template));
    return response?.["hydra:member"] ?? [];
  }
}
