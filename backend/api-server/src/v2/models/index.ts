/**
 * V2 Models Index
 *
 * Central export file for all Sequelize models.
 * Sets up model associations.
 */

import sequelize from '../config/sequelize';
import User from './User.model';
import Organization from './Organization.model';
import Role from './Role.model';
import PasswordResetToken from './PasswordResetToken.model';

// Set up associations

// User belongs to Organization
User.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// Organization has many Users
Organization.hasMany(User, {
  foreignKey: 'organizationId',
  as: 'users',
});

// User belongs to Role
User.belongsTo(Role, {
  foreignKey: 'roleId',
  as: 'role',
});

// Role has many Users
Role.hasMany(User, {
  foreignKey: 'roleId',
  as: 'users',
});

// PasswordResetToken belongs to User
PasswordResetToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// User has many PasswordResetTokens
User.hasMany(PasswordResetToken, {
  foreignKey: 'userId',
  as: 'passwordResetTokens',
});

// Export models and sequelize instance
export {
  sequelize,
  User,
  Organization,
  Role,
  PasswordResetToken,
};

// Default export for convenience
export default {
  sequelize,
  User,
  Organization,
  Role,
  PasswordResetToken,
};
