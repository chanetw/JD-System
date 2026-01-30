/**
 * Organization Interfaces for V2 Auth System
 */

// Organization settings structure
export interface IOrganizationSettings {
  theme?: 'light' | 'dark';
  language?: 'th' | 'en';
  logo?: string;
  primaryColor?: string;
  [key: string]: unknown;
}

// Organization attributes stored in database
export interface IOrganizationAttributes {
  id: number;
  tenantId: number;
  name: string;
  slug: string;
  settings: IOrganizationSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Attributes required for organization creation
export interface IOrganizationCreationAttributes {
  tenantId: number;
  name: string;
  slug: string;
  settings?: IOrganizationSettings;
  isActive?: boolean;
}

// Organization response
export interface IOrganization {
  id: number;
  tenantId: number;
  name: string;
  slug: string;
  settings: IOrganizationSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Request payload for creating an organization
export interface IOrganizationCreateRequest {
  tenantId: number;
  name: string;
  slug: string;
  settings?: IOrganizationSettings;
}

// Request payload for updating an organization
export interface IOrganizationUpdateRequest {
  name?: string;
  slug?: string;
  settings?: IOrganizationSettings;
  isActive?: boolean;
}
