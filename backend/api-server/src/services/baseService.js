/**
 * @file baseService.js
 * @description Base Service Class สำหรับการทำงานกับ Database
 * 
 * จัดเตรียมฟังก์ชั่นพื้นฐานสำหรับ:
 * - CRUD operations
 * - Error handling
 * - Logging
 * - Transaction support
 */

import { getDatabase } from '../config/database.js';

/**
 * Base Service Class
 * สำหรับให้ Service อื่นๆ สืบทอดไปใช้
 */
export class BaseService {
  constructor() {
    this.prisma = getDatabase();
  }

  /**
   * จัดการ error จาก Prisma operations
   * 
   * @param {Error} error - Error จาก database operation
   * @param {string} operation - ชื่อ operation ที่เกิด error
   * @param {string} entity - ชื่อ entity/table
   * @returns {Object} - Formatted error response
   */
  handleError(error, operation, entity) {
    console.error(`[${entity}] ${operation} failed:`, error);

    // Prisma unique constraint error
    if (error.code === 'P2002') {
      return {
        success: false,
        error: 'DUPLICATE_ENTRY',
        message: 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
        details: error.meta?.target || []
      };
    }

    // Prisma record not found error
    if (error.code === 'P2025') {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'ไม่พบข้อมูลที่ต้องการ',
        details: error.meta?.cause || 'Record not found'
      };
    }

    // Prisma foreign key constraint error
    if (error.code === 'P2003') {
      return {
        success: false,
        error: 'FOREIGN_KEY_CONSTRAINT',
        message: 'ไม่สามารถลบข้อมูลนี้ได้เนื่องจากมีการใช้งานอยู่',
        details: error.meta?.field || []
      };
    }

    // Generic error
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: 'เกิดข้อผิดพลาดในการทำงานกับฐานข้อมูล',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }

  /**
   * สร้าง response สำเร็จ
   * 
   * @param {*} data - ข้อมูลที่ต้องการส่งกลับ
   * @param {string} message - ข้อความแจ้งเตือน
   * @returns {Object} - Success response
   */
  successResponse(data, message = 'สำเร็จ') {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * ดำเนินการภายใต้ transaction
   * 
   * @param {Function} callback - ฟังก์ชั่นที่ต้องการทำภายใต้ transaction
   * @returns {Promise<Object>} - Result จาก transaction
   */
  async transaction(callback) {
    try {
      const result = await this.prisma.$transaction(callback);
      return this.successResponse(result, 'Transaction completed successfully');
    } catch (error) {
      return this.handleError(error, 'TRANSACTION', 'DATABASE');
    }
  }

  /**
   * ตรวจสอบว่า record มีอยู่จริง
   * 
   * @param {string} model - ชื่อ Prisma model
   * @param {number} id - ID ที่ต้องการตรวจสอบ
   * @param {Object} where - Additional where conditions
   * @returns {Promise<boolean>} - true ถ้าพบข้อมูล
   */
  async exists(model, id, where = {}) {
    try {
      const record = await this.prisma[model].findFirst({
        where: { id, ...where }
      });
      return !!record;
    } catch (error) {
      console.error(`[BaseService] Check existence failed for ${model}:`, error);
      return false;
    }
  }

  /**
   * ดึงข้อมูลแบบ paginated
   * 
   * @param {string} model - ชื่อ Prisma model
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated result
   */
  async paginate(model, options = {}) {
    const {
      page = 1,
      limit = 20,
      where = {},
      orderBy = { createdAt: 'desc' },
      include = {},
      select = null
    } = options;

    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.prisma[model].findMany({
          where,
          orderBy,
          include,
          select,
          skip,
          take: limit
        }),
        this.prisma[model].count({ where })
      ]);

      return this.successResponse({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      return this.handleError(error, 'PAGINATE', model);
    }
  }
}

export default BaseService;
