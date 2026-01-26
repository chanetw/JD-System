/**
 * @file index.js
 * @description Re-export ไฟล์จาก Shared Components เพื่อให้ compatible กับ path เดิม
 * 
 * หลังจาก Refactoring เสร็จสมบูรณ์ ไฟล์นี้จะถูกลบ และ import path ทั้งหมดจะเปลี่ยนไปใช้
 * @modules/shared/components แทน
 */

// Re-export Components ที่ใช้บ่อย
export { default as Button } from './Button';
export { Card, CardHeader, CardBody } from './Card';
export { FormInput, FormSelect, FormTextarea } from './FormInput';
export { default as Modal } from './Modal';
export { default as FileUpload } from './FileUpload';
export { default as Badge } from './Badge';
export { default as RoleSwitcher } from './RoleSwitcher';

// Role & Scope Management Components (Multi-Role Support)
export { 
    default as RoleSelectionCheckbox,
    RoleSelectionCompact,
    RoleRadioSelect 
} from './RoleSelectionCheckbox';
export { 
    default as ScopeConfigPanel,
    ScopePreview 
} from './ScopeConfigPanel';

// Responsive Components
export {
    ResponsiveContainer,
    MobileOnly,
    TabletOnly,
    DesktopOnly,
    HiddenOnMobile,
    ResponsiveGrid,
    ResponsiveStack,
    ResponsiveText,
    MobileMenu,
    TouchFriendlyButton
} from './ResponsiveContainer';
