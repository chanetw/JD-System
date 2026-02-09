/**
 * Role Interfaces for V2 Auth System (RBAC)
 */

// Predefined role names (V1 naming convention)
export enum RoleName {
  ADMIN = 'Admin',
  REQUESTER = 'Requester',
  APPROVER = 'Approver',
  ASSIGNEE = 'Assignee',
}

// Permission structure for each resource
export interface IResourcePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

// Extended permissions for jobs (includes approve)
export interface IJobPermissions extends IResourcePermissions {
  approve: boolean;
}

// Report permissions
export interface IReportPermissions {
  view: boolean;
  export: boolean;
}

// Settings permissions
export interface ISettingsPermissions {
  manage: boolean;
}

// Complete permissions structure
export interface IPermissions {
  users: IResourcePermissions;
  organizations: IResourcePermissions;
  jobs: IJobPermissions;
  reports: IReportPermissions;
  settings: ISettingsPermissions;
}

// Role attributes stored in database
export interface IRoleAttributes {
  id: number;
  name: RoleName;
  displayName: string;
  permissions: IPermissions;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Role interface (for responses)
export interface IRole {
  id: number;
  name: RoleName;
  displayName: string;
  permissions: IPermissions;
  description?: string;
}

// Default permissions for each role (V1 naming)
export const DEFAULT_PERMISSIONS: Record<RoleName, IPermissions> = {
  [RoleName.ADMIN]: {
    users: { create: true, read: true, update: true, delete: true },
    organizations: { create: true, read: true, update: true, delete: true },
    jobs: { create: true, read: true, update: true, delete: true, approve: true },
    reports: { view: true, export: true },
    settings: { manage: true },
  },
  [RoleName.REQUESTER]: {
    users: { create: true, read: true, update: true, delete: true },
    organizations: { create: false, read: true, update: true, delete: false },
    jobs: { create: true, read: true, update: true, delete: true, approve: true },
    reports: { view: true, export: true },
    settings: { manage: false },
  },
  [RoleName.APPROVER]: {
    users: { create: false, read: true, update: false, delete: false },
    organizations: { create: false, read: true, update: false, delete: false },
    jobs: { create: true, read: true, update: true, delete: false, approve: true },
    reports: { view: true, export: false },
    settings: { manage: false },
  },
  [RoleName.ASSIGNEE]: {
    users: { create: false, read: false, update: false, delete: false },
    organizations: { create: false, read: true, update: false, delete: false },
    jobs: { create: false, read: true, update: true, delete: false, approve: false },
    reports: { view: false, export: false },
    settings: { manage: false },
  },
};
