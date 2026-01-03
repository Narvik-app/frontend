import {pathsMatch} from "~/utils/resource";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {useAppConfigStore} from "~/stores/useAppConfig";
import {Permission} from "~/types/api/permissions";

const pathsAccessibleToAll = [
  "^/unsubscribe\\?.*"
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

  "^/admin/sales",
]

// Permission-based paths: supervisors need specific permissions to access these
const permissionPaths: { pattern: string; permission: Permission }[] = [
  // Email paths
  { pattern: "^/admin/email$", permission: Permission.EmailSend },
  { pattern: "^/admin/email/new", permission: Permission.EmailSend },
  { pattern: "^/admin/email/templates", permission: Permission.EmailTemplate },

  // Import paths
  { pattern: "^/admin/imports/members", permission: Permission.ImportMembers },
  { pattern: "^/admin/imports/photos", permission: Permission.ImportPhotos },
  { pattern: "^/admin/imports/presences", permission: Permission.ImportPresences },
  { pattern: "^/admin/imports/cerbere", permission: Permission.ImportPresences },
]

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
