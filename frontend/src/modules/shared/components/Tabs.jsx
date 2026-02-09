import React from 'react';

/**
 * Tabs Component
 * @param {Object} props
 * @param {Array<{id: string, label: string, icon?: React.ComponentType, count?: number}>} props.tabs - Array of tab definitions
 * @param {string|number} props.activeTab - Currently active tab ID
 * @param {function(string|number): void} props.onChange - Handler for tab changes
 * @param {string} [props.className] - Additional CSS classes
 */
const Tabs = ({ tabs, activeTab, onChange, className = '' }) => {
    return (
        <div className={`border-b border-gray-200 ${className}`}>
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={`
                                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200
                                ${isActive
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {Icon && (
                                <Icon
                                    className={`
                                        -ml-0.5 mr-2 h-5 w-5
                                        ${isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
                                    `}
                                    aria-hidden="true"
                                />
                            )}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span
                                    className={`
                                        ml-2.5 py-0.5 px-2.5 rounded-full text-xs font-medium md:inline-block
                                        ${isActive
                                            ? 'bg-indigo-100 text-indigo-600'
                                            : 'bg-gray-100 text-gray-900'
                                        }
                                    `}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default Tabs;
