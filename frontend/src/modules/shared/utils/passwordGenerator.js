/**
 * @file passwordGenerator.js
 * @description Utility สำหรับสร้างและตรวจสอบ password
 */

/**
 * สร้าง password แบบสุ่ม
 * @param {number} length - ความยาว password (default: 12)
 * @param {object} options - ตัวเลือกความซับซ้อน
 * @returns {string} - Password ที่สร้างขึ้น
 */
export const generatePassword = (length = 12, options = {}) => {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = false, // ไม่ใช้ symbols เพื่อให้พิมพ์ง่าย
    excludeSimilar = true  // ไม่ใช้: l, 1, I, O, 0
  } = options;

  let charset = '';
  let password = '';

  // สร้าง charset ตามตัวเลือก
  if (includeLowercase) charset += 'abcdefghjkmnpqrstuvwxyz';
  if (includeUppercase) charset += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  if (includeNumbers) charset += excludeSimilar ? '23456789' : '0123456789';
  if (includeSymbols) charset += '!@#$%^&*';

  // ตรวจสอบว่ามี charset หรือไม่
  if (!charset) {
    throw new Error('กรุณาเลือกอย่างน้อยหนึ่งประเภทอักขระ');
  }

  // สร้าง array สำหรับตรวจสอบว่ามีอักขระแต่ละประเภท
  const ensure = [];
  if (includeLowercase) ensure.push('abcdefghjkmnpqrstuvwxyz');
  if (includeUppercase) ensure.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
  if (includeNumbers) ensure.push(excludeSimilar ? '23456789' : '0123456789');
  if (includeSymbols) ensure.push('!@#$%^&*');

  // เพิ่มอักขระอย่างน้อย 1 ตัวจากแต่ละประเภท
  ensure.forEach(chars => {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  });

  // เติมให้ครบความยาวที่กำหนด
  for (let i = password.length; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // สลับตำแหน่งอักขระแบบสุ่ม
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * สร้าง password แบบออกเสียงได้ (ง่ายต่อการจำ)
 * @param {number} length - ความยาว password (default: 10)
 * @returns {string} - Password ที่สร้างขึ้น
 */
export const generatePronounceablePassword = (length = 10) => {
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const vowels = 'aeiou';
  const numbers = '23456789';
  let password = '';
  
  // สร้างคำที่ออกเสียงได้ (พยัญชนะ-สระ-พยัญชนะ-สระ...)
  for (let i = 0; i < length - 2; i++) {
    if (i % 2 === 0) {
      password += consonants.charAt(Math.floor(Math.random() * consonants.length));
    } else {
      password += vowels.charAt(Math.floor(Math.random() * vowels.length));
    }
  }
  
  // เพิ่มตัวเลข 2 หลักท้าย
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Capitalize ตัวแรก
  return password.charAt(0).toUpperCase() + password.slice(1);
};

/**
 * ตรวจสอบความแข็งแรงของ password
 * @param {string} password - Password ที่ต้องการตรวจสอบ
 * @returns {object} - {isStrong: boolean, score: number, feedback: string[]}
 */
export const validatePasswordStrength = (password) => {
  const feedback = [];
  let score = 0;

  // ตรวจสอบความยาว
  if (password.length >= 12) {
    score += 2;
  } else if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร');
  }

  // ตรวจสอบตัวพิมพ์ใหญ่
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('เพิ่มตัวพิมพ์ใหญ่');
  }

  // ตรวจสอบตัวพิมพ์เล็ก
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('เพิ่มตัวพิมพ์เล็ก');
  }

  // ตรวจสอบตัวเลข
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('เพิ่มตัวเลข');
  }

  // ตรวจสอบอักขระพิเศษ
  if (/[!@#$%^&*]/.test(password)) {
    score += 1;
  } else {
    feedback.push('เพิ่มอักขระพิเศษ (!@#$%^&*)');
  }

  // ตรวจสอบความซ้ำซ้อน
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('มีอักขระซ้ำกันมากเกินไป');
  }

  return {
    isStrong: score >= 5,
    score,
    feedback,
    level: score >= 5 ? 'แข็งแรง' : score >= 3 ? 'ปานกลาง' : 'อ่อนแอ'
  };
};

/**
 * สร้าง temp password สำหรับ user ใหม่ (ตาม business rules)
 * @returns {string} - Temporary password
 */
export const generateTempPassword = () => {
  return generatePassword(12, {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: false, // ไม่ใช้เพื่อให้พิมพ์ง่าย
    excludeSimilar: true
  });
};
