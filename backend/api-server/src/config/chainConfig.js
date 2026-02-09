/**
 * @file chainConfig.js
 * @description Configuration for Job Chaining feature
 *
 * Manages sequential job creation rules, depth limits, and urgent job handling
 */

/**
 * Chain Configuration
 * Controls how jobs are automatically created in sequence
 */
export const chainConfig = {
  /**
   * Maximum depth for chain creation
   * Example: A→B→C (max 3 jobs)
   * Even if C→D is configured, D will NOT be created
   *
   * @type {number}
   * @default 3
   */
  maxChainDepth: parseInt(process.env.MAX_CHAIN_DEPTH || '3'),

  /**
   * Enable full transitive chaining
   * If true: Follow entire chain until maxChainDepth or no more chain
   * If false: Only create one level (current behavior)
   *
   * @type {boolean}
   * @default true
   */
  enableFullTransitive: process.env.ENABLE_FULL_TRANSITIVE !== 'false',

  /**
   * Prevent self-chaining (A → A)
   * Blocks circular references where job type points to itself
   *
   * @type {boolean}
   * @default true
   */
  preventSelfChain: process.env.PREVENT_SELF_CHAIN !== 'false',

  /**
   * Enable circular reference detection
   * Prevents chains like: A → B → C → A → ... (infinite loop)
   *
   * @type {boolean}
   * @default true
   */
  enableCycleDetection: process.env.ENABLE_CYCLE_DETECTION !== 'false',

  /**
   * Days to shift when Urgent job is created
   * When an Urgent job is approved, shift all competing jobs by this many days
   *
   * @type {number}
   * @default 2
   */
  urgentShiftDays: parseInt(process.env.URGENT_SHIFT_DAYS || '2'),

  /**
   * Enable urgent job rescheduling
   * If true: Shift other jobs when urgent job is created
   * If false: Urgent only forces approval, no schedule shift
   *
   * @type {boolean}
   * @default true
   */
  enableUrgentReschedule: process.env.ENABLE_URGENT_RESCHEDULE !== 'false',

  /**
   * Enable notification alerts when job completes
   * Notify next job assignee that they can start
   *
   * @type {boolean}
   * @default true
   */
  enableChainNotifications: process.env.ENABLE_CHAIN_NOTIFICATIONS !== 'false'
};

/**
 * Get configuration value with validation
 * @param {string} key - Config key
 * @returns {*} Config value or default
 */
export function getChainConfig(key) {
  if (!(key in chainConfig)) {
    console.warn(`[ChainConfig] Unknown config key: ${key}`);
    return null;
  }
  return chainConfig[key];
}

/**
 * Validate chain configuration
 * @returns {Object} Validation result
 */
export function validateChainConfig() {
  const errors = [];

  if (chainConfig.maxChainDepth < 1) {
    errors.push('maxChainDepth must be >= 1');
  }

  if (chainConfig.maxChainDepth > 10) {
    errors.push('maxChainDepth should not exceed 10 (prevents explosion)');
  }

  if (chainConfig.urgentShiftDays < 0) {
    errors.push('urgentShiftDays must be >= 0');
  }

  if (errors.length > 0) {
    console.error('[ChainConfig] Validation errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    return { valid: false, errors };
  }

  console.log('[ChainConfig] Validation passed ✓');
  console.log(`  - maxChainDepth: ${chainConfig.maxChainDepth}`);
  console.log(`  - enableFullTransitive: ${chainConfig.enableFullTransitive}`);
  console.log(`  - urgentShiftDays: ${chainConfig.urgentShiftDays}`);

  return { valid: true, errors: [] };
}
