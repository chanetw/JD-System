/**
 * LoadingSpinner Component
 * Standardized loading animation used throughout the application
 * SVG-based spinner with animated rotation
 */

export const LoadingSpinner = ({
  size = 'md',
  color = 'rose',
  className = '',
  label = 'Loading...'
}) => {
  // Size variants
  const sizeClasses = {
    sm: 'h-5 w-5 mx-auto',
    md: 'h-8 w-8 mx-auto',
    lg: 'h-12 w-12 mx-auto',
    xl: 'h-16 w-16 mx-auto'
  };

  // Color variants
  const colorClasses = {
    rose: 'text-rose-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    indigo: 'text-indigo-600'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        fill="none"
        viewBox="0 0 24 24"
        aria-label={label}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && (
        <p className="mt-2 text-sm text-gray-600">{label}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
