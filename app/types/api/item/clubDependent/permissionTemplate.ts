import type { Item } from "~/types/api/item";
import type { MemberPermission } from "~/types/api/item/clubDependent/memberPermission";

export interface PermissionTemplate extends Item {
  uuid?: string;
  name: string;
  permissions?: MemberPermission[];
  permissionsCount?: number;
}

export interface PermissionTemplateWrite extends Item {
  club: string;
  name: string;
}

export interface PermissionTemplateUpdate {
  name: string;
}
