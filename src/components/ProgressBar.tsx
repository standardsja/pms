import React from 'react';

interface ProgressBarProps {
    percentage: number;
    color?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
    percentage, 
    color = 'primary', 
    size = 'md', 
    className = '' 
}) => {
    const sizeClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3'
    };

    const colorClasses = {
        primary: 'bg-primary',
        success: 'bg-success', 
        warning: 'bg-warning',
        info: 'bg-info',
        danger: 'bg-danger'
    };

    // Clamp percentage between 0 and 100
    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

    // Generate width class based on percentage ranges
    const getWidthClass = (percent: number) => {
        if (percent === 0) return 'w-0';
        if (percent <= 10) return 'w-[10%]';
        if (percent <= 20) return 'w-[20%]';
        if (percent <= 30) return 'w-[30%]';
        if (percent <= 40) return 'w-[40%]';
        if (percent <= 50) return 'w-[50%]';
        if (percent <= 60) return 'w-[60%]';
        if (percent <= 70) return 'w-[70%]';
        if (percent <= 80) return 'w-[80%]';
        if (percent <= 90) return 'w-[90%]';
        return 'w-full';
    };

    return (
        <div className={`${sizeClasses[size]} w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}>
            <div 
                className={`h-full ${colorClasses[color]} ${getWidthClass(clampedPercentage)} transition-all duration-300`}
            />
        </div>
    );
};

export default ProgressBar;