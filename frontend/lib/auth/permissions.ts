import { useUser } from "@/lib/auth/queries/useUser";
import type { User } from "@/lib/user/types";

export function hasRole(
  user: Pick<User, "roles" | "permissions"> | null | undefined,
  role: string,
): boolean {
  return user?.roles.includes(role) ?? false;
}

export function hasAnyRole(
  user: Pick<User, "roles" | "permissions"> | null | undefined,
  roles: string[],
): boolean {
  return roles.some((role) => hasRole(user, role));
}

export function hasAllRoles(
  user: Pick<User, "roles" | "permissions"> | null | undefined,
  roles: string[],
): boolean {
  return roles.every((role) => hasRole(user, role));
}

export function hasPermission(
  user: Pick<User, "roles" | "permissions"> | null | undefined,
  permission: string,
): boolean {
  return user?.permissions.includes(permission) ?? false;
}

export function hasAnyPermission(
  user: Pick<User, "roles" | "permissions"> | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(
  user: Pick<User, "roles" | "permissions"> | null | undefined,
  permissions: string[],
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function useAuthPermissions() {
  const { data: user } = useUser();

  return {
    user,
    hasRole: (role: string) => hasRole(user, role),
    hasAnyRole: (roles: string[]) => hasAnyRole(user, roles),
    hasAllRoles: (roles: string[]) => hasAllRoles(user, roles),
    hasPermission: (permission: string) => hasPermission(user, permission),
    hasAnyPermission: (permissions: string[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: string[]) => hasAllPermissions(user, permissions),
  };
}

export function useHasAnyRole(roles: string[]): boolean {
  const { data: user } = useUser();
  return hasAnyRole(user, roles);
}

export function useHasAllRoles(roles: string[]): boolean {
  const { data: user } = useUser();
  return hasAllRoles(user, roles);
}

export function useHasAnyPermission(permissions: string[]): boolean {
  const { data: user } = useUser();
  return hasAnyPermission(user, permissions);
}

export function useHasAllPermissions(permissions: string[]): boolean {
  const { data: user } = useUser();
  return hasAllPermissions(user, permissions);
}
