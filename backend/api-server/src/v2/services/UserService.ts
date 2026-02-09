/**
 * User Service for V2 Auth System
 *
 * Handles user CRUD operations with organization scoping.
 */

import { Op, WhereOptions } from 'sequelize';
import { User, Organization, Role } from '../models';
import { hashPassword } from '../utils/passwordUtils';
import {
  IUserResponse,
  IUserCreateRequest,
  IUserUpdateRequest,
  IUserListFilters,
  IPaginationOptions,
  IPaginatedResponse,
} from '../interfaces/IUser';
import { RoleName } from '../interfaces/IRole';

export class UserService {
  /**
   * List users with pagination and filters
   */
  async listUsers(
    filters: IUserListFilters,
    pagination: IPaginationOptions
  ): Promise<IPaginatedResponse<IUserResponse>> {
    const { tenantId, organizationId, search, roleId, isActive } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: WhereOptions = {
      tenantId,
    };

    if (organizationId) {
      where.organizationId = typeof organizationId === 'string'
        ? parseInt(organizationId, 10)
        : organizationId;
    }

    if (roleId) {
      where.roleId = roleId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where[Op.or as unknown as string] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Query users with pagination
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization' },
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    // Format response
    const users = rows.map((user) => this.formatUserResponse(user));

    return {
      data: users,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get user by ID with tenant verification
   */
  async getUserById(userId: number, tenantId: number): Promise<IUserResponse | null> {
    const user = await User.findOne({
      where: { id: userId, tenantId },
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization' },
      ],
    });

    if (!user) return null;

    return this.formatUserResponse(user);
  }

  /**
   * Create a new user
   */
  async createUser(data: IUserCreateRequest): Promise<IUserResponse> {
    const { tenantId, organizationId, email, password, firstName, lastName, roleId } = data;

    // Verify organization exists
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      throw new Error('ORGANIZATION_NOT_FOUND');
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase(),
        tenantId: tenantId || organization.tenantId,
      },
    });

    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    // Get default role if not specified
    let effectiveRoleId = roleId;
    if (!effectiveRoleId) {
      const defaultRole = await Role.findOne({
        where: { name: RoleName.MEMBER },
      });
      if (!defaultRole) {
        throw new Error('DEFAULT_ROLE_NOT_FOUND');
      }
      effectiveRoleId = defaultRole.id;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      tenantId: tenantId || organization.tenantId,
      organizationId,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      roleId: effectiveRoleId,
      isActive: true,
    });

    // Reload with associations
    await user.reload({
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization' },
      ],
    });

    return this.formatUserResponse(user);
  }

  /**
   * Update a user
   */
  async updateUser(userId: number, data: IUserUpdateRequest): Promise<IUserResponse> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Prepare update data
    const updateData: Partial<{
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      roleId: number;
      isActive: boolean;
    }> = {};

    if (data.email) {
      // Check if new email is already taken
      const existingUser = await User.findOne({
        where: {
          email: data.email.toLowerCase(),
          tenantId: user.tenantId,
          id: { [Op.ne]: userId },
        },
      });

      if (existingUser) {
        throw new Error('EMAIL_EXISTS');
      }

      updateData.email = data.email.toLowerCase();
    }

    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.roleId) updateData.roleId = data.roleId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update user
    await user.update(updateData);

    // Reload with associations
    await user.reload({
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization' },
      ],
    });

    return this.formatUserResponse(user);
  }

  /**
   * Soft delete a user (set isActive = false)
   */
  async deleteUser(userId: number): Promise<void> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    await user.update({ isActive: false });
  }

  /**
   * Get users by organization (for Approver access)
   */
  async getUsersByOrganization(
    organizationId: number,
    tenantId: number,
    pagination: IPaginationOptions
  ): Promise<IPaginatedResponse<IUserResponse>> {
    return this.listUsers(
      { tenantId, organizationId },
      pagination
    );
  }

  /**
   * Format user model to response object
   */
  private formatUserResponse(user: User): IUserResponse {
    return {
      id: user.id,
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      roleId: user.roleId,
      roleName: user.role?.name || RoleName.MEMBER,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        permissions: user.role.permissions,
        description: user.role.description,
      } : undefined,
      organization: user.organization ? {
        id: user.organization.id,
        tenantId: user.organization.tenantId,
        name: user.organization.name,
        slug: user.organization.slug,
        isActive: user.organization.isActive,
        createdAt: user.organization.createdAt,
        updatedAt: user.organization.updatedAt,
      } : undefined,
    };
  }
}

export default new UserService();
