/**
 * Role Model for V2 Auth System (RBAC)
 *
 * Defines user roles with JSON-based permissions.
 * Predefined roles: SuperAdmin, OrgAdmin, TeamLead, Member
 */

import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { IRoleAttributes, IPermissions, RoleName } from '../interfaces/IRole';

// Attributes required for creation (id and timestamps are auto-generated)
interface IRoleCreationAttributes extends Optional<IRoleAttributes, 'id' | 'description' | 'createdAt' | 'updatedAt'> {}

class Role extends Model<IRoleAttributes, IRoleCreationAttributes> implements IRoleAttributes {
  public id!: number;
  public name!: RoleName;
  public displayName!: string;
  public permissions!: IPermissions;
  public description?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Check if role has a specific permission
   */
  public hasPermission(resource: keyof IPermissions, action: string): boolean {
    const resourcePerms = this.permissions[resource];
    if (!resourcePerms) return false;
    return (resourcePerms as Record<string, boolean>)[action] === true;
  }

  /**
   * Check if this role has higher or equal priority than another role
   * SuperAdmin > OrgAdmin > TeamLead > Member
   */
  public hasRolePriority(otherRole: RoleName): boolean {
    const priority: Record<RoleName, number> = {
      [RoleName.SUPER_ADMIN]: 4,
      [RoleName.ORG_ADMIN]: 3,
      [RoleName.TEAM_LEAD]: 2,
      [RoleName.MEMBER]: 1,
    };
    return priority[this.name] >= priority[otherRole];
  }
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.ENUM(...Object.values(RoleName)),
      allowNull: false,
      unique: true,
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'display_name',
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: 'v2_roles',
    timestamps: true,
    underscored: true,
  }
);

export default Role;
