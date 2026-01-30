/**
 * Password Reset Token Model for V2 Auth System
 *
 * Manages secure token-based password reset with expiry.
 */

import { Model, DataTypes, Optional } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/sequelize';
import { IPasswordResetTokenAttributes } from '../interfaces/IAuth';
import User from './User.model';

// Attributes required for creation
interface IPasswordResetTokenCreationAttributes extends Optional<IPasswordResetTokenAttributes, 'id' | 'token' | 'usedAt' | 'createdAt'> {}

class PasswordResetToken extends Model<IPasswordResetTokenAttributes, IPasswordResetTokenCreationAttributes> implements IPasswordResetTokenAttributes {
  public id!: number;
  public userId!: number;
  public token!: string;
  public expiresAt!: Date;
  public usedAt?: Date;
  public readonly createdAt!: Date;

  // Association
  public readonly user?: User;

  /**
   * Check if token is valid (not used and not expired)
   */
  public isValid(): boolean {
    return !this.usedAt && new Date() < this.expiresAt;
  }

  /**
   * Mark token as used
   */
  public async markAsUsed(): Promise<void> {
    this.usedAt = new Date();
    await this.save();
  }

  /**
   * Generate a secure random token (64 hex characters = 32 bytes)
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate expiry time (default: 1 hour from now)
   */
  static getExpiryTime(hours: number = 1): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
}

PasswordResetToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'v2_users',
        key: 'id',
      },
    },
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'v2_password_reset_tokens',
    timestamps: true,
    updatedAt: false, // No updatedAt for this model
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['token'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['expires_at'],
      },
    ],
    hooks: {
      beforeCreate: (instance) => {
        // Generate token if not provided
        if (!instance.token) {
          instance.token = PasswordResetToken.generateToken();
        }
      },
    },
  }
);

export default PasswordResetToken;
