import type {Item} from "~/types/api/item";
import type {Permission} from "~/types/api/permissions";

export interface MemberPermission extends Item {
  uuid: string;
  permission: Permission;
}

export interface MemberPermissionWrite extends Item {
  member: string;
  permission: Permission;
}

export interface TemplatePermissionWrite extends Item {
  template: string;
  permission: Permission;
}
