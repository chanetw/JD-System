import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

const MOBILE_QUERY = '(max-width: 639px)';
const EMPTY_RECT = { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };

function optionText(children) {
    if (children == null) return '';
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(optionText).join('');
    return '';
}

function normalizeOptions(options, children) {
    if (Array.isArray(options)) {
        return options.map((opt) => {
            if (typeof opt === 'string' || typeof opt === 'number') {
                return { value: String(opt), label: String(opt), disabled: false };
            }
            return {
                ...opt,
                value: opt.value == null ? '' : String(opt.value),
                label: opt.label == null ? String(opt.value ?? '') : String(opt.label),
                disabled: Boolean(opt.disabled)
            };
        });
    }

    return React.Children.toArray(children)
        .filter((child) => React.isValidElement(child) && child.type === 'option')
        .map((child) => ({
            value: child.props.value == null ? '' : String(child.props.value),
            label: optionText(child.props.children),
            disabled: Boolean(child.props.disabled),
            title: child.props.title
        }));
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(MOBILE_QUERY).matches;
    });

    useEffect(() => {
        const media = window.matchMedia(MOBILE_QUERY);
        const handleChange = () => setIsMobile(media.matches);
        handleChange();
        media.addEventListener?.('change', handleChange);
        return () => media.removeEventListener?.('change', handleChange);
    }, []);

    return isMobile;
}

export default function ResponsiveSelect({
    label,
    required,
    options,
    children,
    value = '',
    onChange,
    onValueChange,
    name,
    disabled = false,
    error,
    helperText,
    placeholder = 'เลือก',
    className = '',
    wrapperClassName = '',
    labelClassName = 'block text-sm font-medium text-gray-700 mb-1',
    menuClassName = '',
    leadingIcon: LeadingIcon,
    searchable,
    searchPlaceholder = 'ค้นหา...',
    emptyText = 'ไม่พบข้อมูล',
    buttonAriaLabel,
    ...triggerProps
}) {
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const searchRef = useRef(null);
    const optionRefs = useRef([]);
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [position, setPosition] = useState({ rect: EMPTY_RECT, direction: 'down', maxHeight: 320 });

    const normalizedOptions = useMemo(() => normalizeOptions(options, children), [options, children]);
    const selectedValue = value == null ? '' : String(value);
    const selectedOption = normalizedOptions.find((opt) => String(opt.value) === selectedValue);
    const enableSearch = searchable ?? normalizedOptions.length > 10;

    const filteredOptions = useMemo(() => {
        if (!query.trim()) return normalizedOptions;
        const needle = query.trim().toLowerCase();
        return normalizedOptions.filter((opt) =>
            `${opt.label} ${opt.description || ''}`.toLowerCase().includes(needle)
        );
    }, [normalizedOptions, query]);

    const updatePosition = () => {
        const rect = triggerRef.current?.getBoundingClientRect() || EMPTY_RECT;
        const viewportHeight = window.innerHeight || 720;
        const spaceBelow = viewportHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        const direction = spaceBelow < 220 && spaceAbove > spaceBelow ? 'up' : 'down';
        const maxHeight = Math.max(180, Math.min(direction === 'up' ? spaceAbove : spaceBelow, 420));
        setPosition({ rect, direction, maxHeight });
    };

    const close = () => {
        setOpen(false);
        setQuery('');
    };

    const openMenu = () => {
        if (disabled) return;
        updatePosition();
        setOpen(true);
        const selectedIndex = normalizedOptions.findIndex((opt) => String(opt.value) === selectedValue);
        setActiveIndex(Math.max(0, selectedIndex));
    };

    const emitChange = (nextValue) => {
        onValueChange?.(nextValue);
        onChange?.({
            target: { value: nextValue, name },
            currentTarget: { value: nextValue, name }
        });
    };

    const selectOption = (opt) => {
        if (!opt || opt.disabled) return;
        emitChange(opt.value);
        close();
        requestAnimationFrame(() => triggerRef.current?.focus());
    };

    useEffect(() => {
        if (!open) return undefined;
        updatePosition();
        const handlePointerDown = (event) => {
            if (triggerRef.current?.contains(event.target)) return;
            if (menuRef.current?.contains(event.target)) return;
            close();
        };
        const handleResize = () => {
            if (isMobile) return;
            close();
        };
        const handleScroll = (event) => {
            if (isMobile) return;
            const target = event.target;

            if (target instanceof Node) {
                if (menuRef.current?.contains(target)) return;
                if (triggerRef.current?.contains(target)) return;
            }

            close();
        };
        document.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [open, isMobile]);

    useEffect(() => {
        if (!open) return;
        if (enableSearch) {
            requestAnimationFrame(() => searchRef.current?.focus());
        } else {
            requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
        }
    }, [open, enableSearch, activeIndex]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    const handleTriggerKeyDown = (event) => {
        if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            openMenu();
        }
    };

    const handleMenuKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            triggerRef.current?.focus();
            return;
        }
        if (!filteredOptions.length) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((idx) => Math.min(idx + 1, filteredOptions.length - 1));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((idx) => Math.max(idx - 1, 0));
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            selectOption(filteredOptions[activeIndex]);
        }
    };

    const triggerClasses = [
        'relative flex min-h-[40px] w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500',
        disabled ? 'cursor-not-allowed bg-gray-50 text-gray-400' : 'cursor-pointer hover:bg-gray-50',
        error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300',
        className
    ].filter(Boolean).join(' ');

    const menuStyle = isMobile
        ? {}
        : {
            position: 'fixed',
            left: `${position.rect.left}px`,
            width: `${position.rect.width}px`,
            maxHeight: `${position.maxHeight}px`,
            top: position.direction === 'down' ? `${position.rect.bottom + 6}px` : 'auto',
            bottom: position.direction === 'up' ? `${window.innerHeight - position.rect.top + 6}px` : 'auto',
            zIndex: 10000
        };

    const menuContent = (
        <div
            ref={menuRef}
            role="listbox"
            aria-label={buttonAriaLabel || label || placeholder}
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            className={[
                isMobile
                    ? 'fixed inset-x-0 bottom-0 z-[10000] max-h-[80dvh] rounded-t-2xl border border-gray-200 bg-white shadow-2xl'
                    : 'rounded-lg border border-gray-200 bg-white shadow-xl',
                menuClassName
            ].filter(Boolean).join(' ')}
            style={menuStyle}
        >
            {isMobile && (
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{label || placeholder}</p>
                    <button
                        type="button"
                        onClick={close}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="ปิด"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            {enableSearch && (
                <div className="border-b border-gray-100 p-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="min-h-[40px] w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                    </div>
                </div>
            )}
            <div className="max-h-[inherit] overflow-y-auto py-1">
                {filteredOptions.length > 0 ? filteredOptions.map((opt, index) => {
                    const selected = String(opt.value) === selectedValue;
                    return (
                        <button
                            key={`${opt.value}-${index}`}
                            ref={(node) => { optionRefs.current[index] = node; }}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            disabled={opt.disabled}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => selectOption(opt)}
                            className={[
                                'flex min-h-[40px] w-full items-center gap-2 px-3 py-2 text-left text-sm',
                                index === activeIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700',
                                selected ? 'font-semibold' : 'font-medium',
                                opt.disabled ? 'cursor-not-allowed text-gray-400 opacity-60' : 'hover:bg-blue-50'
                            ].filter(Boolean).join(' ')}
                        >
                            <span className="flex-1 min-w-0">
                                <span className="block truncate">{opt.label}</span>
                                {opt.description && <span className="block truncate text-xs font-normal text-gray-500">{opt.description}</span>}
                            </span>
                            {selected && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                    );
                }) : (
                    <p className="px-3 py-6 text-center text-sm text-gray-400">{emptyText}</p>
                )}
            </div>
        </div>
    );

    return (
        <div className={wrapperClassName}>
            {label && (
                <label className={labelClassName}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={buttonAriaLabel || label || placeholder}
                {...triggerProps}
                onClick={(event) => {
                    triggerProps.onClick?.(event);
                    if (event.defaultPrevented) return;
                    open ? close() : openMenu();
                }}
                onKeyDown={handleTriggerKeyDown}
                className={triggerClasses}
            >
                {LeadingIcon && <LeadingIcon className="h-4 w-4 shrink-0 text-gray-400" />}
                <span className={`min-w-0 flex-1 truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {helperText && !error && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {open && createPortal(
                <>
                    {isMobile && <button type="button" className="fixed inset-0 z-[9999] bg-black/30" aria-label="ปิด dropdown" onClick={close} />}
                    {menuContent}
                </>,
                document.body
            )}
        </div>
    );
}
