/**
 * User Model for V2 Auth System
 *
 * Users belong to an organization and have a role.
 * Supports multi-tenancy via tenantId.
 */

import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { IUserAttributes } from '../interfaces/IUser';
import Role from './Role.model';
import Organization from './Organization.model';

// Attributes required for creation
interface IUserCreationAttributes extends Optional<IUserAttributes, 'id' | 'isActive' | 'lastLoginAt' | 'createdAt' | 'updatedAt'> {}

class User extends Model<IUserAttributes, IUserCreationAttributes> implements IUserAttributes {
  public id!: number;
  public tenantId!: number;
  public organizationId!: number;
  public email!: string;
  public passwordHash!: string;
  public firstName!: string;
  public lastName!: string;
  public roleId!: number;
  public isActive!: boolean;
  public lastLoginAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly role?: Role;
  public readonly organization?: Organization;

  /**
   * Get user's full name
   */
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Convert to response object (without password)
   */
  public toResponse(): Omit<IUserAttributes, 'passwordHash'> & { fullName: string; role?: Role; organization?: Organization } {
    const { passwordHash, ...userData } = this.toJSON();
    return {
      ...userData,
      fullName: this.fullName,
      role: this.role,
      organization: this.organization,
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'organization_id',
      references: {
        model: 'v2_organizations',
        key: 'id',
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id',
      references: {
        model: 'v2_roles',
        key: 'id',
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: 'last_login_at',
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'v2_users',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['tenant_id', 'email'],
      },
      {
        fields: ['tenant_id'],
      },
      {
        fields: ['organization_id'],
      },
      {
        fields: ['role_id'],
      },
      {
        fields: ['is_active'],
      },
    ],
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['passwordHash'] },
      },
    },
  }
);

export default User;
