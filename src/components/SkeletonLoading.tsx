import React from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface SkeletonLoadingProps {
    type?: 'card' | 'table' | 'chart' | 'stats' | 'full';
    count?: number;
    className?: string;
}

const themeBaseColor = '#f0f0f0';
const themeHighlightColor = '#e0e0e0';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <SkeletonTheme baseColor={themeBaseColor} highlightColor={themeHighlightColor}>
        <div className={`rounded-lg p-4 ${className}`}>
            <Skeleton height={24} width="80%" />
            <Skeleton height={16} width="100%" style={{ marginTop: 12 }} />
            <Skeleton height={16} width="85%" style={{ marginTop: 8 }} />
        </div>
    </SkeletonTheme>
);

export const SkeletonLine: React.FC<{ className?: string }> = ({ className = '' }) => (
    <SkeletonTheme baseColor={themeBaseColor} highlightColor={themeHighlightColor}>
        <Skeleton height={16} width="100%" className={className} />
    </SkeletonTheme>
);

export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 6 }) => (
    <SkeletonTheme baseColor={themeBaseColor} highlightColor={themeHighlightColor}>
        <tr className="border-b border-gray-200 dark:border-gray-700">
            {Array.from({ length: columns }).map((_, idx) => (
                <td key={idx} className="px-4 py-3">
                    <Skeleton height={16} />
                </td>
            ))}
        </tr>
    </SkeletonTheme>
);

export const SkeletonStats: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <SkeletonTheme baseColor={themeBaseColor} highlightColor={themeHighlightColor}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="panel">
                    <Skeleton height={48} width="100%" />
                    <Skeleton height={16} width="75%" style={{ marginTop: 12 }} />
                </div>
            ))}
        </div>
    </SkeletonTheme>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 6 }) => (
    <SkeletonTheme baseColor={themeBaseColor} highlightColor={themeHighlightColor}>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        {Array.from({ length: columns }).map((_, idx) => (
                            <th key={idx} className="px-4 py-3">
                                <Skeleton height={16} width="75%" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, ridx) => (
                        <SkeletonTableRow key={ridx} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    </SkeletonTheme>
);

export const SkeletonChart: React.FC<{ height?: string }> = ({ height = 'h-96' }) => (
    <SkeletonTheme baseColor={themeBaseColor} highlightColor={themeHighlightColor}>
        <div className={`panel rounded-lg ${height}`}>
            <Skeleton height={24} width="40%" />
            <Skeleton height={300} style={{ marginTop: 24 }} />
        </div>
    </SkeletonTheme>
);

export const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({ type = 'full', count = 3, className = '' }) => {
    return (
        <SkeletonTheme baseColor={themeBaseColor} highlightColor={themeHighlightColor}>
            {type === 'card' && (
                <div className={`space-y-3 rounded-lg p-4 ${className}`}>
                    <Skeleton height={24} width="75%" />
                    <Skeleton height={16} />
                    <Skeleton height={16} width="85%" />
                </div>
            )}

            {type === 'table' && <SkeletonTable rows={count} />}

            {type === 'chart' && <SkeletonChart />}

            {type === 'stats' && <SkeletonStats count={count} />}

            {type === 'full' && (
                <div className={`space-y-6 ${className}`}>
                    <div className="space-y-2">
                        <Skeleton height={32} width="33%" />
                        <Skeleton height={16} width="50%" />
                    </div>
                    <SkeletonStats count={4} />
                    <SkeletonTable rows={5} />
                    <Skeleton height={16} width="25%" />
                </div>
            )}
        </SkeletonTheme>
    );
};

export default SkeletonLoading;
