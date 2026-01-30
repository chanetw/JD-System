/**
 * Sequelize Configuration for V2 Auth System
 *
 * Uses PostgreSQL connection from environment variables.
 * Supports both local development and Supabase PostgreSQL.
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL or use individual env vars
const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      url: databaseUrl,
      dialectOptions: {
        ssl: databaseUrl.includes('supabase') ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    };
  }

  return {
    database: process.env.DB_NAME || 'dj_system',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialectOptions: {}
  };
};

const config = getDatabaseConfig();

// Create Sequelize instance
export const sequelize = 'url' in config
  ? new Sequelize(config.url!, {
      dialect: 'postgres',
      dialectOptions: config.dialectOptions,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    })
  : new Sequelize(config.database!, config.username!, config.password!, {
      host: config.host,
      port: config.port,
      dialect: 'postgres',
      dialectOptions: config.dialectOptions,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    });

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('[V2 Auth] Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('[V2 Auth] Unable to connect to the database:', error);
    return false;
  }
};

// Sync models (use with caution in production)
export const syncModels = async (options: { force?: boolean; alter?: boolean } = {}): Promise<void> => {
  try {
    await sequelize.sync(options);
    console.log('[V2 Auth] Models synchronized successfully.');
  } catch (error) {
    console.error('[V2 Auth] Error synchronizing models:', error);
    throw error;
  }
};

export default sequelize;
