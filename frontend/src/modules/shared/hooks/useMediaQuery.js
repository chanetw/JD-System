/**
 * @file useMediaQuery.js
 * @description Custom hooks for responsive design
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Breakpoint definitions (matching Tailwind CSS defaults)
 */
export const BREAKPOINTS = {
    sm: 640,    // Small devices (phones)
    md: 768,    // Medium devices (tablets)
    lg: 1024,   // Large devices (laptops)
    xl: 1280,   // Extra large devices (desktops)
    '2xl': 1536 // 2XL screens
};

/**
 * Hook for checking media query
 * @param {string} query - Media query string (e.g., '(min-width: 768px)')
 * @returns {boolean}
 */
export const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        setMatches(mediaQuery.matches);

        const handler = (event) => setMatches(event.matches);
        
        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            // Legacy browsers
            mediaQuery.addListener(handler);
            return () => mediaQuery.removeListener(handler);
        }
    }, [query]);

    return matches;
};

/**
 * Hook for checking if device is mobile
 * @returns {boolean}
 */
export const useIsMobile = () => {
    return !useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
};

/**
 * Hook for checking if device is tablet
 * @returns {boolean}
 */
export const useIsTablet = () => {
    const isAboveMobile = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
    const isBelowDesktop = useMediaQuery(`(max-width: ${BREAKPOINTS.lg - 1}px)`);
    return isAboveMobile && isBelowDesktop;
};

/**
 * Hook for checking if device is desktop
 * @returns {boolean}
 */
export const useIsDesktop = () => {
    return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
};

/**
 * Hook for getting current breakpoint
 * @returns {'mobile' | 'tablet' | 'desktop' | 'wide'}
 */
export const useBreakpoint = () => {
    const isMobile = !useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
    const isTablet = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`) && !useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
    const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`) && !useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);

    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    if (isDesktop) return 'desktop';
    return 'wide';
};

/**
 * Hook for getting window dimensions
 * @returns {{ width: number, height: number }}
 */
export const useWindowSize = () => {
    const [size, setSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0
    });

    useEffect(() => {
        const handleResize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return size;
};

/**
 * Hook for detecting orientation
 * @returns {'portrait' | 'landscape'}
 */
export const useOrientation = () => {
    const [orientation, setOrientation] = useState(
        typeof window !== 'undefined' && window.innerHeight > window.innerWidth
            ? 'portrait'
            : 'landscape'
    );

    useEffect(() => {
        const handleResize = () => {
            setOrientation(
                window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
            );
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return orientation;
};

/**
 * Hook for detecting touch device
 * @returns {boolean}
 */
export const useIsTouchDevice = () => {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        setIsTouch(
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
        );
    }, []);

    return isTouch;
};

/**
 * Hook for responsive values
 * Returns different values based on screen size
 * @param {Object} values - Object with breakpoint keys
 * @param {any} values.default - Default value
 * @param {any} values.sm - Value for small screens
 * @param {any} values.md - Value for medium screens
 * @param {any} values.lg - Value for large screens
 * @param {any} values.xl - Value for extra large screens
 * @returns {any}
 */
export const useResponsiveValue = (values) => {
    const breakpoint = useBreakpoint();
    
    const breakpointMap = {
        'mobile': ['sm', 'default'],
        'tablet': ['md', 'sm', 'default'],
        'desktop': ['lg', 'md', 'sm', 'default'],
        'wide': ['xl', 'lg', 'md', 'sm', 'default']
    };

    const priorities = breakpointMap[breakpoint];
    
    for (const key of priorities) {
        if (values[key] !== undefined) {
            return values[key];
        }
    }
    
    return values.default;
};

export default {
    useMediaQuery,
    useIsMobile,
    useIsTablet,
    useIsDesktop,
    useBreakpoint,
    useWindowSize,
    useOrientation,
    useIsTouchDevice,
    useResponsiveValue,
    BREAKPOINTS
};
