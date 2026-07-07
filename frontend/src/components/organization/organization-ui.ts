import type { AssignableRole, OrganizationBoardRole } from '@/api/organizations';

export const organizationRoles: AssignableRole[] = ['TEAM_LEAD', 'MEMBER', 'VIEWER'];
export const organizationBoardRoles: OrganizationBoardRole[] = ['MANAGER', 'MEMBER', 'VIEWER'];

export const roleLabel = (role: string) => {
  if (role === 'OWNER') return 'Manager';
  return role.replace('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
};

export const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
