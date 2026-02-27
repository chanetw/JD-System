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

      // TEMPORARY: Role filter disabled due to Prisma query issue
      // Filter will be done on frontend instead
      // if (role) {
      //   where.userRoles = {
      //     some: {
      //       roleName: role
      //     }
      //   };
      // }

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
          departmentId: true, // Include departmentId directly for frontend compatibility
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
          },
          // Include Job Assignments (Responsibilities)
          assignedProjects: {
            where: { isActive: true },
            select: {
              id: true,
              projectId: true,
              jobTypeId: true,
              project: { select: { name: true, code: true } },
              jobType: { select: { name: true } }
            }
          }
        }
      });

      // Map scopeAssignments and userRoles for frontend compatibility
      const users = result.data?.data;
      if (users && users.length > 0) {
        users.forEach(user => {
          // Map userRoles -> roles
          user.roles = (user.userRoles || []).map(r => ({
            name: r.roleName,
            isActive: true,
            scopes: [] // Initial empty scopes, populated below via scope_assignments logic if needed
          }));

          // Map scopeAssignments -> scope_assignments (snake_case)
          user.scope_assignments = (user.scopeAssignments || []).map(s => ({
            user_id: user.id,
            scope_id: s.scopeId,
            scope_level: s.scopeLevel,
            scope_name: s.scopeName,
            role_type: s.roleType
          }));

          // Populate scopes back into roles for full compatibility
          user.roles.forEach(role => {
            role.scopes = user.scope_assignments
              .filter(s => s.role_type === role.name)
              .map(s => ({
                level: s.scope_level,
                scopeId: s.scope_id,
                scopeName: s.scope_name
              }));
          });

          // ⚡ NEW: Add assignedScopes grouped by type (for faster UI access)
          user.assignedScopes = {
            tenants: [],
            buds: [],
            projects: []
          };

          user.scope_assignments.forEach(scope => {
            const scopeObj = {
              id: scope.scope_id,
              name: scope.scope_name,
              level: scope.scope_level
            };

            const level = scope.scope_level?.toLowerCase();
            if (level === 'tenant') {
              user.assignedScopes.tenants.push(scopeObj);
            } else if (level === 'bud') {
              user.assignedScopes.buds.push(scopeObj);
            } else if (level === 'project') {
              user.assignedScopes.projects.push(scopeObj);
            }
          });

          // ⚡ NEW: Transform assignedProjects → jobAssignments (for faster display)
          user.jobAssignments = (user.assignedProjects || []).map(a => ({
            id: a.id,
            projectId: a.projectId,
            projectName: a.project?.name,
            projectCode: a.project?.code,
            jobTypeId: a.jobTypeId,
            jobTypeName: a.jobType?.name
          }));

          // Add direct roleName field for frontend compatibility (uses first/primary role)
          user.roleName = user.roles[0]?.name || null;

          delete user.scopeAssignments;
          // Note: we keep userRoles for reference or delete if strict
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
      console.log('[UserService] updateUser called:', { userId, updateData });

      // ถ้ามีการอัปเดต password ให้เข้ารหัสก่อน
      if (updateData.password) {
        updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
        delete updateData.password;
      }

      // Build clean update data (only valid Prisma fields)
      const prismaData = {};
      if (updateData.firstName !== undefined) prismaData.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) prismaData.lastName = updateData.lastName;
      if (updateData.displayName !== undefined) prismaData.displayName = updateData.displayName;
      if (updateData.phone !== undefined) prismaData.phone = updateData.phone;
      if (updateData.title !== undefined) prismaData.title = updateData.title;
      if (updateData.email !== undefined) prismaData.email = updateData.email;
      if (updateData.isActive !== undefined) prismaData.isActive = updateData.isActive;
      if (updateData.passwordHash !== undefined) prismaData.passwordHash = updateData.passwordHash;
      // Handle departmentId - critical for department assignment
      if (updateData.departmentId !== undefined) {
        prismaData.departmentId = updateData.departmentId ? parseInt(updateData.departmentId, 10) : null;
      }

      console.log('[UserService] Prisma update data:', prismaData);

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: prismaData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          departmentId: true,
          isActive: true,
          updatedAt: true
        }
      });

      console.log('[UserService] User updated successfully:', user);
      return this.successResponse(user, 'อัปเดตข้อมูลผู้ใช้สำเร็จ');
    } catch (error) {
      console.error('[UserService] Update user failed:', error);
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
      // 1. ดึงข้อมูล User หลัก (include departmentId directly)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true, // Prisma schema uses avatarUrl (maps to avatar_url)
          isActive: true,
          tenantId: true,
          departmentId: true, // Direct field for reliable access
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
        department: user.department?.name,
        departmentId: user.departmentId, // Use direct field (not from relation)
        avatar: user.avatarUrl, // Map avatarUrl to avatar for frontend compatibility
        isActive: user.isActive,
        tenantId: user.tenantId,
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

  /**
   * ดึงรายการงานที่ได้รับมอบหมาย (Project & BUD Job Assignments) ของผู้ใช้
   *
   * @param {number} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} - รายการงานที่ได้รับมอบหมาย (แยก BUD และ Project)
   */
  async getUserAssignments(userId) {
    try {
      // ⚡ Fetch both BUD-level and Project-level assignments in parallel
      const [projectAssignments, budAssignments] = await Promise.all([
        // Project-level assignments
        this.prisma.projectJobAssignment.findMany({
          where: {
            assigneeId: userId,
            isActive: true
          },
          include: {
            project: {
              select: { id: true, name: true, code: true, budId: true }
            },
            jobType: {
              select: { id: true, name: true }
            }
          }
        }),

        // BUD-level assignments (NEW!)
        this.prisma.budJobAssignment.findMany({
          where: {
            assigneeId: userId,
            isActive: true
          },
          include: {
            bud: {
              select: { id: true, name: true, code: true }
            },
            jobType: {
              select: { id: true, name: true }
            }
          }
        })
      ]);

      return this.successResponse({
        projectAssignments: projectAssignments.map(a => ({
          id: a.id,
          projectId: a.projectId,
          projectName: a.project?.name,
          projectCode: a.project?.code,
          budId: a.project?.budId,
          jobTypeId: a.jobTypeId,
          jobTypeName: a.jobType?.name,
          priority: a.priority || 100
        })),
        budAssignments: budAssignments.map(a => ({
          id: a.id,
          budId: a.budId,
          budName: a.bud?.name,
          budCode: a.bud?.code,
          jobTypeId: a.jobTypeId,
          jobTypeName: a.jobType?.name,
          priority: a.priority || 50
        }))
      });
    } catch (error) {
      return this.handleError(error, 'GET_USER_ASSIGNMENTS', 'User');
    }
  }

  /**
   * ตรวจสอบความขัดแย้งของการมอบหมายงาน (Check Conflicts)
   * 
   * @param {number} userId - ID ของผู้ใช้ที่จะมอบหมาย
   * @param {Array<number>} jobTypeIds - รายการ ID ของประเภทงาน
   * @param {Array<number>} projectIds - รายการ ID ของโครงการ
   * @returns {Promise<Object>} - รายการที่มีความขัดแย้ง
   */
  async checkAssignmentConflicts(userId, jobTypeIds, projectIds) {
    try {
      console.log(`[UserService] Checking conflicts for User ${userId}: Projects=${projectIds?.length}, JobTypes=${jobTypeIds?.length}`);

      if (!projectIds || projectIds.length === 0 || !jobTypeIds || jobTypeIds.length === 0) {
        return this.successResponse([]);
      }

      // Optimize: Fetch potentially conflicting assignments in one query
      // We fetch all assignments for these projects and job types
      const existingAssignments = await this.prisma.projectJobAssignment.findMany({
        where: {
          projectId: { in: projectIds },
          jobTypeId: { in: jobTypeIds }
        },
        include: {
          assignee: {
            select: { id: true, displayName: true, firstName: true, lastName: true }
          },
          project: { select: { id: true, name: true } },
          jobType: { select: { id: true, name: true } }
        }
      });

      const conflicts = [];
      // Filter in memory for exact matches (projectId + jobTypeId) that are assigned to OTHER users
      for (const existing of existingAssignments) {
        // If assigned to someone else
        if (existing.assigneeId && existing.assigneeId !== userId) {
          // Double check if this pair is actually requested (it must be due to query, but to be safe)
          if (projectIds.includes(existing.projectId) && jobTypeIds.includes(existing.jobTypeId)) {
            conflicts.push({
              projectId: existing.projectId,
              projectName: existing.project.name,
              jobTypeId: existing.jobTypeId,
              jobTypeName: existing.jobType.name,
              currentAssigneeId: existing.assigneeId,
              currentAssigneeName: existing.assignee.displayName || `${existing.assignee.firstName} ${existing.assignee.lastName}`
            });
          }
        }
      }

      return this.successResponse(conflicts);
    } catch (error) {
      return this.handleError(error, 'CHECK_ASSIGNMENT_CONFLICTS', 'User');
    }
  }

  /**
   * อัปเดตการมอบหมายงานให้ผู้ใช้ (Update User Assignments)
   *
   * Supports both BUD-level and Project-level assignments with priority:
   * - BUD-level (priority 50): Covers all projects in BUD
   * - Project-level (priority 100): Override for specific projects
   *
   * @param {number} userId - ID ของผู้ใช้
   * @param {Object} assignments - { jobTypeIds: [], budIds: [], projectIds: [] }
   * @param {Object} context - { executedBy, tenantId }
   */
  async updateUserAssignments(userId, { jobTypeIds, budIds = [], projectIds = [] }, { executedBy, tenantId }) {
    try {
      console.log(`[UserService] Updating assignments for user ${userId}: JobTypes=${jobTypeIds?.length}, BUDs=${budIds?.length}, Projects=${projectIds?.length}`);

      return await this.prisma.$transaction(async (tx) => {
        // 1. Deactivate ALL existing assignments (both BUD and Project)
        // Optimization: Run these in parallel
        await Promise.all([
          tx.budJobAssignment.updateMany({
            where: { assigneeId: userId, tenantId },
            data: { isActive: false }
          }),
          tx.projectJobAssignment.updateMany({
            where: { assigneeId: userId },
            data: { isActive: false }
          })
        ]);

        const results = {
          budAssignments: [],
          projectAssignments: []
        };

        // 2. Create/Update BUD-level assignments (Optimized with Promise.all)
        if (budIds && budIds.length > 0 && jobTypeIds && jobTypeIds.length > 0) {
          const budPromises = [];
          for (const budId of budIds) {
            for (const jobTypeId of jobTypeIds) {
              budPromises.push(
                tx.budJobAssignment.upsert({
                  where: {
                    tenantId_budId_jobTypeId: {
                      tenantId,
                      budId,
                      jobTypeId
                    }
                  },
                  update: {
                    assigneeId: userId,
                    isActive: true,
                    priority: 50,
                    updatedAt: new Date()
                  },
                  create: {
                    tenantId,
                    budId,
                    jobTypeId,
                    assigneeId: userId,
                    isActive: true,
                    priority: 50
                  }
                })
              );
            }
          }
          results.budAssignments = await Promise.all(budPromises);
        }

        // 3. Create/Update Project-level assignments (Optimized with Promise.all)
        if (projectIds && projectIds.length > 0 && jobTypeIds && jobTypeIds.length > 0) {
          const projectPromises = [];
          for (const projectId of projectIds) {
            for (const jobTypeId of jobTypeIds) {
              projectPromises.push(
                tx.projectJobAssignment.upsert({
                  where: {
                    projectId_jobTypeId: {
                      projectId,
                      jobTypeId
                    }
                  },
                  update: {
                    assigneeId: userId,
                    isActive: true,
                    priority: 100,
                    updatedAt: new Date()
                  },
                  create: {
                    projectId,
                    jobTypeId,
                    assigneeId: userId,
                    isActive: true,
                    priority: 100
                  }
                })
              );
            }
          }
          results.projectAssignments = await Promise.all(projectPromises);
        }

        console.log(`[UserService] ✅ Saved assignments for user ${userId}:`, {
          budAssignments: results.budAssignments.length,
          projectAssignments: results.projectAssignments.length
        });

        return this.successResponse(results, 'บันทึกการมอบหมายงานสำเร็จ');
      }, {
        maxWait: 10000, // Wait for lock up to 10s
        timeout: 20000  // Transaction must finish in 20s
      });
    } catch (error) {
      console.error(`[UserService] Error updating assignments for user ${userId}:`, error);
      return this.handleError(error, 'UPDATE_USER_ASSIGNMENTS', 'User');
    }
  }

  /**
   * ⚡ Performance: Get all user edit details in ONE query
   * Combines: getUserWithRoles + getUserScopes + getUserAssignments + getDepartmentsByManager
   * Saves ~550ms by fetching all in parallel within a transaction
   */
  async getUserEditDetails(userId, tenantId) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // ⚡ Execute all queries in parallel
        const [user, roles, scopes, budAssignments, projectAssignments, managedDepts] =
          await Promise.all([
            // 1. User basic info
            tx.user.findUnique({
              where: { id: userId },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                displayName: true,
                avatarUrl: true,
                isActive: true,
                tenantId: true,
                departmentId: true,
                department: { select: { id: true, name: true } }
              }
            }),

            // 2. Roles
            tx.userRole.findMany({
              where: { userId, tenantId, isActive: true },
              select: { id: true, roleName: true, isActive: true }
            }),

            // 3. Scopes
            tx.userScopeAssignment.findMany({
              where: { userId, tenantId, isActive: true },
              select: {
                id: true,
                scopeLevel: true,
                scopeId: true,
                scopeName: true,
                roleType: true
              }
            }),

            // 4. BUD assignments
            tx.budJobAssignment.findMany({
              where: { assigneeId: userId, isActive: true },
              include: {
                bud: { select: { id: true, name: true } },
                jobType: { select: { id: true, name: true } }
              }
            }),

            // 5. Project assignments
            tx.projectJobAssignment.findMany({
              where: { assigneeId: userId, isActive: true },
              include: {
                project: { select: { id: true, name: true, budId: true } },
                jobType: { select: { id: true, name: true } }
              }
            }),

            // 6. Managed departments
            tx.department.findMany({
              where: { managerId: userId, tenantId, isActive: true },
              select: { id: true, name: true }
            })
          ]);

        if (!user) throw new Error('User not found');

        // Format roles with scopes
        const rolesWithScopes = roles.map(role => ({
          id: role.id,
          name: role.roleName,
          isActive: role.isActive,
          scopes: scopes
            .filter(s => s.roleType === role.roleName)
            .map(s => ({
              id: s.id,
              level: s.scopeLevel?.toLowerCase(),
              scopeId: s.scopeId,
              scopeName: s.scopeName
            }))
        }));

        // Format assignments
        const assignments = {
          budAssignments: budAssignments.map(a => ({
            budId: a.budId,
            budName: a.bud?.name,
            jobTypeId: a.jobTypeId,
            jobTypeName: a.jobType?.name
          })),
          projectAssignments: projectAssignments.map(a => ({
            projectId: a.projectId,
            projectName: a.project?.name,
            budId: a.project?.budId,
            jobTypeId: a.jobTypeId,
            jobTypeName: a.jobType?.name
          }))
        };

        return this.successResponse({
          user: {
            id: user.id,
            name: user.displayName,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            department: user.department?.name,
            departmentId: user.departmentId,
            isActive: user.isActive,
            tenantId: user.tenantId
          },
          roles: rolesWithScopes,
          assignments,
          managedDepartments: managedDepts
        }, '✅ User edit details loaded');
      });
    } catch (error) {
      console.error(`[UserService] Error getting user edit details for user ${userId}:`, error);
      return this.handleError(error, 'GET_USER_EDIT_DETAILS', 'User');
    }
  }
}

export default UserService;
