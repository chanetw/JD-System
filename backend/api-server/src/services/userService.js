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
          isActive: true,
          createdAt: true,
          department: {
            select: {
              id: true,
              name: true,
              bud: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          managedDepartments: {
            select: {
              id: true
            }
          },
          userRoles: {
            select: {
              roleName: true
            }
          },
          // Use Prisma relation instead of raw SQL
          scopeAssignments: {
            where: { isActive: true },
            select: {
              id: true,
              scopeId: true,
              scopeLevel: true,
              scopeName: true,
              roleType: true
            }
          }
        }
      });

      // Map scopeAssignments to snake_case for frontend compatibility
      if (result.data && result.data.length > 0) {
        result.data.forEach(user => {
          user.scope_assignments = (user.scopeAssignments || []).map(s => ({
            user_id: user.id,
            scope_id: s.scopeId,
            scope_level: s.scopeLevel,
            scope_name: s.scopeName,
            role_type: s.roleType
          }));
          delete user.scopeAssignments;
        });
      }

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

  /**
   * ดึงข้อมูลผู้ใช้พร้อมบทบาทและขอบเขตงาน
   * 
   * @param {number} userId - ID ของผู้ใช้
   * @param {number} tenantId - ID ของ tenant
   * @returns {Promise<Object>} - ข้อมูลผู้ใช้พร้อมบทบาท
   */
  async getUserWithRoles(userId, tenantId) {
    try {
      // 1. ดึงข้อมูล User หลัก
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          department: {
            select: { id: true, name: true }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 2. ดึง Roles
      const roles = await this.prisma.userRole.findMany({
        where: {
          userId: userId,
          tenantId: tenantId,
          isActive: true
        }
      });

      // 3. ดึง Scopes via Prisma relation
      const scopes = await this.prisma.userScopeAssignment.findMany({
        where: {
          userId: userId,
          tenantId: tenantId,
          isActive: true
        }
      });

      // 4. จัด format ให้ตรงกับ frontend adminService ที่เคยทำ
      const rolesWithScopes = roles.map(role => ({
        id: role.id,
        name: role.roleName,
        isActive: role.isActive,
        assignedBy: role.assignedBy,
        assignedAt: role.assignedAt,
        scopes: scopes
          .filter(s => s.roleType === role.roleName)
          .map(s => ({
            id: s.id,
            level: s.scopeLevel?.toLowerCase(),
            scopeId: s.scopeId,
            scopeName: s.scopeName
          }))
      }));

      return this.successResponse({
        id: user.id,
        name: user.displayName,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role, // Legacy
        title: user.title,
        department: user.department?.name,
        departmentId: user.department?.id,
        phone: user.phone,
        avatar: user.avatar, // Prisma map to avatar (check schema if it map("avatar_url"))
        isActive: user.isActive,
        tenantId: user.tenantId, // Prisma map tenant_id
        roles: rolesWithScopes
      }, 'ดึงข้อมูลผู้ใช้สําเร็จ');

    } catch (error) {
      console.error('[UserService] Get user with roles failed:', error);
      return this.handleError(error, 'GET_USER_WITH_ROLES', 'User');
    }
  }

  /**
   * อัปเดตบทบาทและขอบเขตงานของผู้ใช้
   * 
   * @param {number} userId - ID ของผู้ใช้
   * @param {Array} roles - รายการบทบาท
   * @param {Object} context - ข้อมูลผู้ทำรายการ { executedBy, tenantId }
   */
  async updateUserRoles(userId, roles, { executedBy, tenantId }) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. ลบ Roles เดิมทั้งหมด
        await tx.userRole.deleteMany({
          where: { userId: userId }
        });

        // 2. ลบ Scopes เดิมทั้งหมด (ใช้ Prisma model)
        await tx.userScopeAssignment.deleteMany({
          where: { userId: userId }
        });

        // 3. เตรียมข้อมูล Role ใหม่
        const roleRows = roles.map(role => ({
          userId: userId,
          tenantId: tenantId, // ✅ Add Missing TenantID
          roleName: role.name,
          isActive: true,
          assignedBy: executedBy,
          assignedAt: new Date()
        }));

        // 4. บันทึก Roles ใหม่
        if (roleRows.length > 0) {
          await tx.userRole.createMany({
            data: roleRows
          });
        }

        // 5. เตรียมข้อมูล Scope ใหม่ (ใช้ Prisma camelCase)
        const scopeRows = [];
        roles.forEach(role => {
          console.log(`[UserService] Processing role: ${role.name}`, role);
          const roleLevel = role.level || 'project';
          if (role.scopes && role.scopes.length > 0) {
            role.scopes.forEach(scope => {
              scopeRows.push({
                userId: userId,
                tenantId: tenantId,
                roleType: role.name,
                scopeLevel: roleLevel,
                scopeId: scope.scopeId,
                scopeName: scope.scopeName || null,
                assignedBy: executedBy,
                isActive: true
              });
            });
          }
        });

        console.log(`[UserService] Prepared ${scopeRows.length} scope rows for insertion:`, scopeRows);

        // 6. บันทึก Scopes ใหม่ (ใช้ Prisma createMany)
        if (scopeRows.length > 0) {
          await tx.userScopeAssignment.createMany({
            data: scopeRows
          });
        }



        return this.successResponse(null, 'บันทึกบทบาทสำเร็จ');
      });
    } catch (error) {
      console.error('[UserService] Update roles failed:', error);
      return this.handleError(error, 'UPDATE_ROLES', 'User');
    }
  }
}

export default UserService;
