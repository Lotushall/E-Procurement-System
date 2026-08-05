import { useUser } from "@/lib/auth/queries/useUser";
import type { User } from "@/lib/user/types";

export function hasRole(user: User | null | undefined, role: string): boolean {
  return user?.roles.includes(role) ?? false;
}

export function hasAnyRole(user: User | null | undefined, roles: string[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

export function hasAllRoles(user: User | null | undefined, roles: string[]): boolean {
  return roles.every((role) => hasRole(user, role));
}

export function hasPermission(user: User | null | undefined, permission: string): boolean {
  return user?.permissions.includes(permission) ?? false;
}

export function hasAnyPermission(user: User | null | undefined, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(user: User | null | undefined, permissions: string[]): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function useHasRole(role: string): boolean {
  const { data: user } = useUser();
  return hasRole(user, role);
}

export function useHasAnyRole(roles: string[]): boolean {
  const { data: user } = useUser();
  return hasAnyRole(user, roles);
}

export function useHasAllRoles(roles: string[]): boolean {
  const { data: user } = useUser();
  return hasAllRoles(user, roles);
}

export function useHasPermission(permission: string): boolean {
  const { data: user } = useUser();
  return hasPermission(user, permission);
}

export function useHasAnyPermission(permissions: string[]): boolean {
  const { data: user } = useUser();
  return hasAnyPermission(user, permissions);
}

export function useHasAllPermissions(permissions: string[]): boolean {
  const { data: user } = useUser();
  return hasAllPermissions(user, permissions);
}
