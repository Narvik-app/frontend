import {pathsMatch} from "~/utils/resource";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {useAppConfigStore} from "~/stores/useAppConfig";
import {Permission} from "~/types/api/permissions";

const pathsAccessibleToAll = [
  // eslint-disable-next-line no-useless-escape
  "^/unsubscribe\?.*"
]

const publicPaths = [
  "^/login$",
  "^/login/badger-quick-login",
  "^/login/password-reset",
  "^/login/register",
  "^/login/bdg/.*",
]

const supervisorOnlyPaths = [
  "^/admin$",
  "^/admin/members",
  "^/admin/presences",
  "^/admin/statistics",
  "^/admin/thrombinoscope",
]

// Permission-based paths: supervisors need specific permissions to access these
// For viewing pages, ACCESS is enough. For actions, EDIT is required (handled by backend).
const permissionPaths: { pattern: string; permission: Permission }[] = [
  // Email paths - need ACCESS to view
  { pattern: "^/admin/email$", permission: Permission.EmailAccess },
  { pattern: "^/admin/email/new", permission: Permission.EmailEdit },
  { pattern: "^/admin/email/templates$", permission: Permission.EmailTemplateAccess },
  { pattern: "^/admin/email/templates/new", permission: Permission.EmailTemplateEdit },
  { pattern: "^/admin/email/templates/edit", permission: Permission.EmailTemplateEdit },

  // Import paths - need ACCESS to view, EDIT to run import
  { pattern: "^/admin/imports/members", permission: Permission.ImportMembersAccess },
  { pattern: "^/admin/imports/photos", permission: Permission.ImportPhotosAccess },
  { pattern: "^/admin/imports/presences", permission: Permission.ImportPresencesAccess },
  { pattern: "^/admin/imports/cerbere", permission: Permission.ImportPresencesAccess },

  // Sale paths - need ACCESS to view pages
  // Note: specific paths must come BEFORE generic [id] pattern to avoid collision
  { pattern: "^/admin/sales/new$", permission: Permission.SaleNew },
  { pattern: "^/admin/sales$", permission: Permission.SaleHistoryAccess },
  { pattern: "^/admin/sales/history", permission: Permission.SaleHistoryAccess },
  { pattern: "^/admin/sales/payment-modes", permission: Permission.SalePaymentModesAccess },
  { pattern: "^/admin/sales/import", permission: Permission.SaleImportAccess },
  { pattern: "^/admin/sales/[^/]+$", permission: Permission.SaleHistoryAccess }, // Sale detail [id] - must be last
  { pattern: "^/admin/inventories$", permission: Permission.SaleInventoryAccess },
  { pattern: "^/admin/inventories/items", permission: Permission.SaleInventoryAccess },
  { pattern: "^/admin/inventories/categories", permission: Permission.SaleCategoriesAccess },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineNuxtRouteMiddleware(async (to, from) => {
  // Middleware is not run on server side
  if (import.meta.server) return

  const selfStore = useSelfUserStore();
  const appConfigStore = useAppConfigStore();

  if (!selfStore.user && selfStore.isLogged()) {
    await selfStore.refresh();
  }

  if (!appConfigStore.config) {
    await appConfigStore.refresh();
  }

  // Anyone is allowed to access the resource, logged in or not
  if (pathsMatch(pathsAccessibleToAll, to.fullPath)) {
    return;
  }

  if (pathsMatch(publicPaths, to.fullPath)) {
    if (selfStore.isLogged()) { // User is logged
      return navigateTo("/");
    }

    // Nothing more to do, user is free to browse public page
    return;
  }

  // Protected pages

  // User not logged, we redirect him to login page
  if (!selfStore.isLogged()) {
    return navigateTo("/login", { redirectCode:  401});
  }

  if (to.fullPath === "/") {
    if (selfStore.isSuperAdmin() && !selfStore.selectedProfile) {
      return navigateTo("/super-admin")
    }

    if (!selfStore.hasSupervisorRole() && !selfStore.isBadger()) {
      return navigateTo("/self")
    }
  }

  if (pathsMatch(["^/super-admin", "^/super-admin/.*"], to.fullPath)) {
    if (!selfStore.isSuperAdmin()) {
      return navigateTo("/");
    }
  }

  if (pathsMatch(["^/admin", "^/admin/.*"], to.fullPath)) {
    if (!selfStore.hasSupervisorRole()) {
      return navigateTo("/self");
    }

    // User is not an admin (so supervisor) - check allowed paths
    if (!selfStore.isAdmin()) {
      // Check if path matches supervisor-only paths (always allowed for supervisors)
      if (pathsMatch(supervisorOnlyPaths, to.fullPath)) {
        return;
      }

      // Check if path matches permission-based paths
      for (const { pattern, permission } of permissionPaths) {
        if (pathsMatch([pattern], to.fullPath)) {
          if (selfStore.can(permission)) {
            return; // Has permission, allow access
          } else {
            return navigateTo('/admin'); // No permission, redirect
          }
        }
      }

      // Path is not in any allowed list for supervisors
      return navigateTo('/admin')
    }
  }
})
