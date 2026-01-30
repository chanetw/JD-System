/**
 * Organization Model for V2 Auth System
 *
 * Organizations belong to a tenant and contain users.
 * Supports JSON settings for customization.
 */

import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { IOrganizationAttributes, IOrganizationSettings } from '../interfaces/IOrganization';

// Attributes required for creation
interface IOrganizationCreationAttributes extends Optional<IOrganizationAttributes, 'id' | 'settings' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class Organization extends Model<IOrganizationAttributes, IOrganizationCreationAttributes> implements IOrganizationAttributes {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public slug!: string;
  public settings!: IOrganizationSettings;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations will be set up in index.ts
  public readonly users?: import('./User.model').default[];
}

Organization.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        is: /^[a-z0-9-]+$/i, // Only alphanumeric and hyphens
      },
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
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
    tableName: 'v2_organizations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['tenant_id', 'slug'],
      },
      {
        fields: ['tenant_id'],
      },
      {
        fields: ['is_active'],
      },
    ],
  }
);

export default Organization;
