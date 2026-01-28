/**
 * @file userService.js
 * @description User Service - จัดการข้อมูลผู้ใช้
 * 
 * ทำงานกับ:
 * - User authentication
 * - User profile management
 * - Role assignment
 */

import { BaseService } from './baseService.js';
import bcrypt from 'bcrypt';

export class UserService extends BaseService {
  /**
   * สร้างผู้ใช้ใหม่
   * 
   * @param {Object} userData - ข้อมูลผู้ใช้
   * @param {number} userData.tenantId - ID ของ tenant
   * @param {string} userData.email - Email
   * @param {string} userData.password - Password (plain text)
   * @param {string} userData.firstName - ชื่อจริง
   * @param {string} userData.lastName - นามสกุล
   * @param {string} userData.displayName - ชื่อแสดง
   * @param {string} userData.phone - เบอร์โทรศัพท์
   * @returns {Promise<Object>} - ผลลัพธ์การสร้างผู้ใช้
   */
  async createUser(userData) {
    try {
      const { tenantId, email, password, firstName, lastName, displayName, phone } = userData;

      // เข้ารหัส password
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await this.prisma.user.create({
        data: {
          tenantId,
          email,
          passwordHash,
          firstName,
          lastName,
          displayName: displayName || `${firstName} ${lastName}`,
          phone
        },
        select: {
          id: true,
          tenantId: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          phone: true,
          isActive: true,
          createdAt: true
        }
      });

      return this.successResponse(user, 'สร้างผู้ใช้สำเร็จ');
    } catch (error) {
      return this.handleError(error, 'CREATE_USER', 'User');
    }
  }

  /**
   * ค้นหาผู้ใช้ด้วย email และ tenant
   * 
   * @param {string} email - Email ของผู้ใช้
   * @param {number} tenantId - ID ของ tenant
   * @returns {Promise<Object>} - ข้อมูลผู้ใช้ (ไม่รวม password)
   */
  async findByEmail(email, tenantId) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email
          }
        },
        select: {
          id: true,
          tenantId: true,
          email: true,
          passwordHash: true,
          firstName: true,
          lastName: true,
          displayName: true,
          phone: true,
          isActive: true,
          createdAt: true,
          userRoles: {
            select: {
              roleName: true
            }
          }
        }
      });

      if (!user) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'ไม่พบผู้ใช้นี้ในระบบ'
        };
      }

      return this.successResponse(user);
    } catch (error) {
      return this.handleError(error, 'FIND_BY_EMAIL', 'User');
    }
  }

  /**
   * ตรวจสอบ password
   * 
   * @param {string} plainPassword - Password ที่ผู้ใช้กรอก
   * @param {string} hashedPassword - Password ที่เข้ารหัสไว้ใน database
   * @returns {Promise<boolean>} - true ถ้า password ถูกต้อง
   */
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('[UserService] Password verification failed:', error);
      return false;
    }
  }

  /**
   * ดึงข้อมูลผู้ใช้ทั้งหมด (แบบ paginated)
   * 
   * @param {number} tenantId - ID ของ tenant
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - รายการผู้ใช้
   */
  async getUsers(tenantId, options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      isActive = undefined,
      role = ''
    } = options;

    try {
      const where = { tenantId };

      // Filter by active status
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Search by name or email
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Filter by role
      if (role) {
        where.userRoles = {
          some: {
            role: {
              name: role
            }
          }
        };
      }

      const result = await this.paginate('user', {
        page,
        limit,
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          phone: true,
          isActive: true,
          createdAt: true,
          userRoles: {
            select: {
              roleName: true
            }
          }
        }
      });

      return result;
    } catch (error) {
      return this.handleError(error, 'GET_USERS', 'User');
    }
  }

  /**
   * อัปเดตข้อมูลผู้ใช้
   * 
   * @param {number} userId - ID ของผู้ใช้
   * @param {Object} updateData - ข้อมูลที่ต้องการอัปเดต
   * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
   */
  async updateUser(userId, updateData) {
    try {
      // ถ้ามีการอัปเดต password ให้เข้ารหัสก่อน
      if (updateData.password) {
        updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
        delete updateData.password;
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          phone: true,
          isActive: true,
          updatedAt: true
        }
      });

      return this.successResponse(user, 'อัปเดตข้อมูลผู้ใช้สำเร็จ');
    } catch (error) {
      return this.handleError(error, 'UPDATE_USER', 'User');
    }
  }

  /**
   * ลบผู้ใช้ (soft delete - ตั้งค่า isActive = false)
   * 
   * @param {number} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} - ผลลัพธ์การลบ
   */
  async deleteUser(userId) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });

      return this.successResponse(null, 'ลบผู้ใช้สำเร็จ');
    } catch (error) {
      return this.handleError(error, 'DELETE_USER', 'User');
    }
  }
}

export default UserService;
