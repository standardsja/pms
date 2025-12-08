import { getUser } from './auth';

export function getStoredPermissions(): string[] {
  try {
    const user = getUser() as any;
    if (!user) return [];
    return Array.isArray(user.permissions) ? user.permissions : [];
  } catch {
    return [];
  }
}

export function can(permission: string): boolean {
  const perms = getStoredPermissions();
  return perms.includes(permission);
}

export function isDeptManagerFor(deptCode: string): boolean {
  try {
    const user = getUser() as any;
    if (!user) return false;
    const mgr = Array.isArray(user.deptManagerFor) ? user.deptManagerFor : [];
    return mgr.map((m: string) => String(m).toLowerCase()).includes(String(deptCode).toLowerCase());
  } catch {
    return false;
  }
}

export function hasRole(roleName: string): boolean {
  try {
    const user = getUser() as any;
    if (!user) return false;
    const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
    return roles.map((r: any) => (r.name ? r.name : r)).includes(roleName);
  } catch {
    return false;
  }
}

export default { getStoredPermissions, can, isDeptManagerFor, hasRole };
