/**
 * Registration Request Service for V2 Auth System
 *
 * Handles pending registration requests with admin approval workflow.
 */

import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, Organization, Role, PasswordResetToken } from '../models';
import {
  IRegistrationRequest,
  IRegistrationRequestCreate,
  IRegistrationRequestUpdate,
  IPaginatedResponse,
  IPaginationOptions,
} from '../interfaces';

const SALT_ROUNDS = 10;

export class RegistrationRequestService {
  /**
   * Create new registration request (PENDING status)
   */
  async submitRegistrationRequest(
    data: IRegistrationRequestCreate
  ): Promise<IRegistrationRequest> {
    const {
      tenantId,
      organizationId,
      email,
      password,
      firstName,
      lastName,
      ipAddress,
      userAgent,
    } = data;

    // Verify organization exists
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      throw new Error('ORGANIZATION_NOT_FOUND');
    }

    // Check for existing pending request (prevent duplicates)
    const existingRequest = await this.findPendingByEmail(email, organizationId);
    if (existingRequest) {
      throw new Error('PENDING_REQUEST_ALREADY_EXISTS');
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase(),
        tenantId,
      },
    });

    if (existingUser) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate confirmation token (optional email verification)
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create registration request
    // Note: This would use RegistrationRequest model (to be created)
    // For now, we'll structure the response

    const registrationRequest: IRegistrationRequest = {
      id: 0, // Will be assigned by DB
      tenantId,
      organizationId,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      status: 'PENDING',
      confirmationToken,
      confirmationTokenExpiresAt,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In production, save to database
    // const saved = await RegistrationRequest.create(registrationRequest);

    return registrationRequest;
  }

  /**
   * Find pending request by email
   */
  async findPendingByEmail(
    email: string,
    organizationId: number
  ): Promise<IRegistrationRequest | null> {
    // Query from database
    // return await RegistrationRequest.findOne({
    //   where: {
    //     email: email.toLowerCase(),
    //     organizationId,
    //     status: 'PENDING',
    //   },
    // });
    return null;
  }

  /**
   * List registration requests with pagination and filters
   */
  async listRegistrationRequests(
    filters: {
      tenantId: number;
      organizationId?: number;
      status?: string;
      search?: string;
    },
    pagination: IPaginationOptions
  ): Promise<IPaginatedResponse<IRegistrationRequest>> {
    const { tenantId, organizationId, status, search } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Build where clause
    // const where: any = { tenantId };
    // if (organizationId) where.organizationId = organizationId;
    // if (status) where.status = status;
    // if (search) {
    //   where[Op.or] = [
    //     { email: { [Op.iLike]: `%${search}%` } },
    //     { firstName: { [Op.iLike]: `%${search}%` } },
    //     { lastName: { [Op.iLike]: `%${search}%` } },
    //   ];
    // }

    // Query from database
    // const { count, rows } = await RegistrationRequest.findAndCountAll({
    //   where,
    //   limit,
    //   offset,
    //   order: [['createdAt', 'DESC']],
    // });

    // Placeholder response
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  /**
   * Get registration request by ID
   */
  async getRegistrationRequestById(
    id: number,
    tenantId: number
  ): Promise<IRegistrationRequest | null> {
    // return await RegistrationRequest.findOne({
    //   where: { id, tenantId },
    // });
    return null;
  }

  /**
   * Approve registration request and create user
   */
  async approveRegistration(
    registrationRequestId: number,
    adminId: number,
    roleId?: number
  ): Promise<{ user: any; registrationRequest: IRegistrationRequest }> {
    // Get registration request
    // const regRequest = await this.getRegistrationRequestById(registrationRequestId, tenantId);
    // if (!regRequest) throw new Error('REGISTRATION_REQUEST_NOT_FOUND');

    // Get default role if not specified
    // let effectiveRoleId = roleId;
    // if (!effectiveRoleId) {
    //   const defaultRole = await Role.findOne({ where: { name: 'Member' } });
    //   effectiveRoleId = defaultRole?.id;
    // }

    // Create user from registration request
    // const user = await User.create({
    //   tenantId: regRequest.tenantId,
    //   organizationId: regRequest.organizationId,
    //   email: regRequest.email,
    //   passwordHash: regRequest.passwordHash,
    //   firstName: regRequest.firstName,
    //   lastName: regRequest.lastName,
    //   roleId: effectiveRoleId,
    //   isActive: true,
    //   registrationRequestId,
    // });

    // Update registration request status
    // await regRequest.update({
    //   status: 'APPROVED',
    //   reviewedById: adminId,
    //   reviewedAt: new Date(),
    // });

    // Log audit
    // await this.logAuditEvent({
    //   registrationRequestId,
    //   action: 'APPROVED',
    //   oldStatus: 'PENDING',
    //   newStatus: 'APPROVED',
    //   adminId,
    // });

    return {
      user: {}, // Placeholder
      registrationRequest: {} as IRegistrationRequest, // Placeholder
    };
  }

  /**
   * Reject registration request
   */
  async rejectRegistration(
    registrationRequestId: number,
    adminId: number,
    reason?: string
  ): Promise<IRegistrationRequest> {
    // Get registration request
    // const regRequest = await this.getRegistrationRequestById(registrationRequestId, tenantId);
    // if (!regRequest) throw new Error('REGISTRATION_REQUEST_NOT_FOUND');

    // Update status to REJECTED
    // await regRequest.update({
    //   status: 'REJECTED',
    //   rejectionReason: reason,
    //   reviewedById: adminId,
    //   reviewedAt: new Date(),
    // });

    // Log audit
    // await this.logAuditEvent({
    //   registrationRequestId,
    //   action: 'REJECTED',
    //   oldStatus: 'PENDING',
    //   newStatus: 'REJECTED',
    //   adminId,
    //   reason,
    // });

    return {} as IRegistrationRequest; // Placeholder
  }

  /**
   * Log audit event for registration action
   */
  async logAuditEvent(data: {
    registrationRequestId: number;
    action: string;
    oldStatus?: string;
    newStatus?: string;
    adminId?: number;
    reason?: string;
  }): Promise<void> {
    // Create audit log entry
    // await RegistrationAuditLog.create({
    //   registrationRequestId: data.registrationRequestId,
    //   action: data.action,
    //   oldStatus: data.oldStatus,
    //   newStatus: data.newStatus,
    //   adminId: data.adminId,
    //   reason: data.reason,
    // });
  }

  /**
   * Send notification email to admin
   */
  async notifyAdminOfNewRegistration(
    registrationRequest: IRegistrationRequest,
    adminEmail: string
  ): Promise<void> {
    // TODO: Send email via email service
    // const emailService = new EmailService();
    // await emailService.sendEmail({
    //   to: adminEmail,
    //   subject: `New Registration Request - ${registrationRequest.firstName} ${registrationRequest.lastName}`,
    //   template: 'admin-registration-notification',
    //   data: registrationRequest,
    // });
    console.log(`[RegistrationService] Notify admin: ${adminEmail}`);
  }

  /**
   * Send approval email to user
   */
  async notifyUserOfApproval(
    registrationRequest: IRegistrationRequest,
    loginUrl: string
  ): Promise<void> {
    // TODO: Send email via email service
    console.log(`[RegistrationService] Notify user: ${registrationRequest.email}`);
  }

  /**
   * Send rejection email to user
   */
  async notifyUserOfRejection(
    registrationRequest: IRegistrationRequest,
    reason?: string
  ): Promise<void> {
    // TODO: Send email via email service
    console.log(`[RegistrationService] Notify user of rejection: ${registrationRequest.email}`);
  }

  /**
   * Get registration statistics
   */
  async getStatistics(tenantId: number): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    // const counts = await RegistrationRequest.findOne({
    //   attributes: [
    //     [sequelize.fn('COUNT', sequelize.where(sequelize.col('status'), Op.eq, 'PENDING')), 'pending'],
    //     [sequelize.fn('COUNT', sequelize.where(sequelize.col('status'), Op.eq, 'APPROVED')), 'approved'],
    //     [sequelize.fn('COUNT', sequelize.where(sequelize.col('status'), Op.eq, 'REJECTED')), 'rejected'],
    //     [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
    //   ],
    //   where: { tenantId },
    //   raw: true,
    // });

    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    };
  }
}

export default new RegistrationRequestService();
