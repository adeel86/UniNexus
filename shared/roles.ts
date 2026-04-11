export const ROLE_CODES = ["student", "teacher", "university", "industry", "admin"] as const;

export type RoleCode = typeof ROLE_CODES[number];

const roleAliases: Record<string, RoleCode> = {
  student: "student",
  teacher: "teacher",
  university: "university",
  university_admin: "university",
  industry: "industry",
  industry_professional: "industry",
  industry_partner: "industry",
  admin: "admin",
  master_admin: "admin",
};

export const roleLabels: Record<RoleCode, string> = {
  student: "Student",
  teacher: "Teacher",
  university: "University",
  industry: "Industry",
  admin: "Admin",
};

export function normalizeRole(role?: string | null): RoleCode | null {
  if (!role) return null;
  return roleAliases[role] ?? null;
}

export function roleLabel(role?: string | null): string {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? roleLabels[normalizedRole] : "Unknown";
}

export function roleMatches(userRole: string | null | undefined, allowedRole: string): boolean {
  return normalizeRole(userRole) === normalizeRole(allowedRole);
}

export function hasRole(userRole: string | null | undefined, allowedRoles: string[]): boolean {
  const normalizedRole = normalizeRole(userRole);
  return !!normalizedRole && allowedRoles.some((role) => normalizeRole(role) === normalizedRole);
}

export function dashboardPathForRole(role?: string | null): string {
  switch (normalizeRole(role)) {
    case "teacher":
      return "/teacher-dashboard";
    case "university":
      return "/university-dashboard";
    case "industry":
      return "/industry-dashboard";
    case "admin":
      return "/master-admin-dashboard";
    default:
      return "/";
  }
}