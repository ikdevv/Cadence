import type { Role } from "@cadence/shared";

/** Where each role lands after login, and where "home" points for them. */
export function roleHome(role: Role | undefined): string {
  switch (role) {
    case "MANAGER":
      return "/team";
    case "ADMIN":
      return "/admin/users";
    case "MEMBER":
      return "/reports";
    default:
      return "/login";
  }
}

export interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

export const navItems: NavItem[] = [
  { href: "/reports", label: "My reports", roles: ["MEMBER"] },
  { href: "/team", label: "Team dashboard", roles: ["MANAGER", "ADMIN"] },
  { href: "/analytics", label: "Analytics", roles: ["MANAGER", "ADMIN"] },
  { href: "/projects", label: "Projects", roles: ["ADMIN"] },
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
];

export function navFor(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return navItems.filter((item) => item.roles.includes(role));
}
