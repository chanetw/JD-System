/**
 * @file retry.js
 * @description Retry utility สำหรับการทำงานซ้ำเมื่อเกิด error
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function ที่ต้องการ retry
 * @param {Object} options - Retry options
 * @returns {Promise} - ผลลัพธ์จาก function
 */
export const retry = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry = () => {}
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        onRetry(attempt, error);
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Retry with condition - retry เฉพาะเมื่อเงื่อนไขตรง
 * @param {Function} fn - Async function
 * @param {Function} shouldRetry - Function ที่ return boolean (true = retry)
 * @param {Object} options - Retry options
 * @returns {Promise} - ผลลัพธ์จาก function
 */
export const retryIf = async (fn, shouldRetry, options = {}) => {
  const { maxAttempts = 3, delayMs = 1000, onRetry = () => {} } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts && shouldRetry(error)) {
        onRetry(attempt, error);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        break;
      }
    }
  }
  
  throw lastError;
};

export default { retry, retryIf };
