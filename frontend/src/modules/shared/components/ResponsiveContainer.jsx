/**
 * @file ResponsiveContainer.jsx
 * @description Responsive container component with mobile-first approach
 */

import React from 'react';
import { useIsMobile, useIsTablet, useBreakpoint } from '../hooks/useMediaQuery';

/**
 * ResponsiveContainer - Renders different content based on screen size
 * @param {Object} props
 * @param {React.ReactNode} props.mobile - Content for mobile screens
 * @param {React.ReactNode} props.tablet - Content for tablet screens
 * @param {React.ReactNode} props.desktop - Content for desktop screens
 * @param {React.ReactNode} props.children - Default content (fallback)
 */
export const ResponsiveContainer = ({ mobile, tablet, desktop, children }) => {
    const breakpoint = useBreakpoint();

    switch (breakpoint) {
        case 'mobile':
            return mobile || children;
        case 'tablet':
            return tablet || desktop || children;
        case 'desktop':
        case 'wide':
            return desktop || children;
        default:
            return children;
    }
};

/**
 * MobileOnly - Renders content only on mobile
 */
export const MobileOnly = ({ children }) => {
    const isMobile = useIsMobile();
    return isMobile ? children : null;
};

/**
 * TabletOnly - Renders content only on tablet
 */
export const TabletOnly = ({ children }) => {
    const isTablet = useIsTablet();
    return isTablet ? children : null;
};

/**
 * DesktopOnly - Renders content only on desktop
 */
export const DesktopOnly = ({ children }) => {
    const breakpoint = useBreakpoint();
    return breakpoint === 'desktop' || breakpoint === 'wide' ? children : null;
};

/**
 * HiddenOnMobile - Hides content on mobile
 */
export const HiddenOnMobile = ({ children }) => {
    const isMobile = useIsMobile();
    return !isMobile ? children : null;
};

/**
 * ResponsiveGrid - Grid with responsive columns
 * @param {Object} props
 * @param {number} props.mobileColumns - Columns on mobile (default: 1)
 * @param {number} props.tabletColumns - Columns on tablet (default: 2)
 * @param {number} props.desktopColumns - Columns on desktop (default: 3)
 * @param {string} props.gap - Gap between items (default: '4')
 * @param {React.ReactNode} props.children - Grid items
 */
export const ResponsiveGrid = ({
    mobileColumns = 1,
    tabletColumns = 2,
    desktopColumns = 3,
    gap = '4',
    className = '',
    children
}) => {
    const breakpoint = useBreakpoint();
    
    let columns;
    switch (breakpoint) {
        case 'mobile':
            columns = mobileColumns;
            break;
        case 'tablet':
            columns = tabletColumns;
            break;
        default:
            columns = desktopColumns;
    }

    return (
        <div
            className={`grid gap-${gap} ${className}`}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
            {children}
        </div>
    );
};

/**
 * ResponsiveStack - Stack items vertically on mobile, horizontally on larger screens
 */
export const ResponsiveStack = ({
    className = '',
    mobileGap = '4',
    desktopGap = '6',
    reverse = false,
    children
}) => {
    const isMobile = useIsMobile();
    
    const direction = isMobile
        ? (reverse ? 'flex-col-reverse' : 'flex-col')
        : (reverse ? 'flex-row-reverse' : 'flex-row');
    
    const gap = isMobile ? `gap-${mobileGap}` : `gap-${desktopGap}`;

    return (
        <div className={`flex ${direction} ${gap} ${className}`}>
            {children}
        </div>
    );
};

/**
 * ResponsiveText - Text that changes size based on screen
 */
export const ResponsiveText = ({
    as: Component = 'p',
    mobileSize = 'text-sm',
    tabletSize = 'text-base',
    desktopSize = 'text-lg',
    className = '',
    children,
    ...props
}) => {
    const breakpoint = useBreakpoint();
    
    let sizeClass;
    switch (breakpoint) {
        case 'mobile':
            sizeClass = mobileSize;
            break;
        case 'tablet':
            sizeClass = tabletSize;
            break;
        default:
            sizeClass = desktopSize;
    }

    return (
        <Component className={`${sizeClass} ${className}`} {...props}>
            {children}
        </Component>
    );
};

/**
 * MobileMenu - Hamburger menu for mobile navigation
 */
export const MobileMenu = ({
    isOpen,
    onToggle,
    children,
    className = ''
}) => {
    return (
        <>
            {/* Hamburger Button */}
            <button
                onClick={onToggle}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    {isOpen ? (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    )}
                </svg>
            </button>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                        onClick={onToggle}
                    />
                    <div className={`fixed top-0 left-0 w-64 h-full bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${className}`}>
                        {children}
                    </div>
                </>
            )}
        </>
    );
};

/**
 * TouchFriendlyButton - Button with larger touch target for mobile
 */
export const TouchFriendlyButton = ({
    children,
    className = '',
    ...props
}) => {
    const isMobile = useIsMobile();
    
    const sizeClass = isMobile
        ? 'min-h-[44px] min-w-[44px] px-4 py-3'
        : 'px-3 py-2';

    return (
        <button
            className={`${sizeClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default {
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
};
