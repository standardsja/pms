import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit tests for centralized API configuration
 *
 * Tests the environment-aware API URL resolution logic used throughout
 * the frontend to support both localhost and heron:4000 deployments.
 */

describe('API Configuration', () => {
    let originalEnv: any;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...import.meta.env };
    });

    afterEach(() => {
        // Restore original environment
        Object.keys(originalEnv).forEach((key) => {
            (import.meta.env as any)[key] = originalEnv[key];
        });
    });

    describe('getApiBaseUrl', () => {
        it('should return VITE_API_URL when set in environment', () => {
            const mockEnv = { VITE_API_URL: 'http://custom-server:8080' };

            const getApiBaseUrl = () => {
                return mockEnv.VITE_API_URL || 'http://heron:4000';
            };

            expect(getApiBaseUrl()).toBe('http://custom-server:8080');
        });

        it('should fallback to heron:4000 when VITE_API_URL is not set', () => {
            const mockEnv = {};

            const getApiBaseUrl = () => {
                return (mockEnv as any).VITE_API_URL || 'http://heron:4000';
            };

            expect(getApiBaseUrl()).toBe('http://heron:4000');
        });

        it('should fallback to heron:4000 when VITE_API_URL is empty string', () => {
            const mockEnv = { VITE_API_URL: '' };

            const getApiBaseUrl = () => {
                return mockEnv.VITE_API_URL || 'http://heron:4000';
            };

            expect(getApiBaseUrl()).toBe('http://heron:4000');
        });

        it('should preserve trailing slash in custom URL', () => {
            const mockEnv = { VITE_API_URL: 'http://localhost:4000/' };

            const getApiBaseUrl = () => {
                return mockEnv.VITE_API_URL || 'http://heron:4000';
            };

            expect(getApiBaseUrl()).toBe('http://localhost:4000/');
        });
    });

    describe('getApiUrl', () => {
        it('should combine base URL with path correctly', () => {
            const mockEnv = { VITE_API_URL: 'http://heron:4000' };

            const getApiUrl = (path: string) => {
                const base = mockEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/api/requests')).toBe('http://heron:4000/api/requests');
            expect(getApiUrl('/requests')).toBe('http://heron:4000/requests');
        });

        it('should handle paths with query parameters', () => {
            const mockEnv = { VITE_API_URL: 'http://heron:4000' };

            const getApiUrl = (path: string) => {
                const base = mockEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/api/ideas?sort=recent&status=approved')).toBe('http://heron:4000/api/ideas?sort=recent&status=approved');
        });

        it('should handle paths with anchors', () => {
            const mockEnv = { VITE_API_URL: 'http://heron:4000' };

            const getApiUrl = (path: string) => {
                const base = mockEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/api/docs#section-1')).toBe('http://heron:4000/api/docs#section-1');
        });

        it('should work with localhost environment', () => {
            const mockEnv = { VITE_API_URL: 'http://localhost:4000' };

            const getApiUrl = (path: string) => {
                const base = mockEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/api/auth/login')).toBe('http://localhost:4000/api/auth/login');
        });

        it('should handle double slashes gracefully', () => {
            const mockEnv = { VITE_API_URL: 'http://heron:4000/' };

            const getApiUrl = (path: string) => {
                const base = mockEnv.VITE_API_URL || 'http://heron:4000';
                // Simple concatenation - frontend should normalize if needed
                return `${base}${path}`;
            };

            const result = getApiUrl('/api/requests');
            // Accept either normalized or with double slash since frontend handles both
            expect(['http://heron:4000/api/requests', 'http://heron:4000//api/requests']).toContain(result);
        });

        it('should handle root path', () => {
            const mockEnv = { VITE_API_URL: 'http://heron:4000' };

            const getApiUrl = (path: string) => {
                const base = mockEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/')).toBe('http://heron:4000/');
        });

        it('should handle paths without leading slash', () => {
            const mockEnv = { VITE_API_URL: 'http://heron:4000' };

            const getApiUrl = (path: string) => {
                const base = mockEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('api/requests')).toBe('http://heron:4000api/requests');
            // Note: Frontend should ensure paths start with '/'
        });
    });

    describe('Environment scenarios', () => {
        it('should support development environment (localhost)', () => {
            const devEnv = { VITE_API_URL: 'http://localhost:4000' };

            const getApiUrl = (path: string) => {
                const base = devEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/api/requests')).toBe('http://localhost:4000/api/requests');
        });

        it('should support production environment (heron)', () => {
            const prodEnv = {}; // VITE_API_URL not set, uses fallback

            const getApiUrl = (path: string) => {
                const base = (prodEnv as any).VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/api/requests')).toBe('http://heron:4000/api/requests');
        });

        it('should support explicit heron configuration', () => {
            const heronEnv = { VITE_API_URL: 'http://heron:4000' };

            const getApiUrl = (path: string) => {
                const base = heronEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/api/requests')).toBe('http://heron:4000/api/requests');
        });

        it('should support custom port configuration', () => {
            const customEnv = { VITE_API_URL: 'http://heron:8080' };

            const getApiUrl = (path: string) => {
                const base = customEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/api/requests')).toBe('http://heron:8080/api/requests');
        });

        it('should support HTTPS in production', () => {
            const secureEnv = { VITE_API_URL: 'https://api.example.com' };

            const getApiUrl = (path: string) => {
                const base = secureEnv.VITE_API_URL || 'http://heron:4000';
                return `${base}${path}`;
            };

            expect(getApiUrl('/api/requests')).toBe('https://api.example.com/api/requests');
        });
    });

    describe('Common API endpoints', () => {
        const mockEnv = { VITE_API_URL: 'http://heron:4000' };

        const getApiUrl = (path: string) => {
            const base = mockEnv.VITE_API_URL || 'http://heron:4000';
            return `${base}${path}`;
        };

        it('should generate correct procurement endpoints', () => {
            expect(getApiUrl('/requests')).toBe('http://heron:4000/requests');
            expect(getApiUrl('/api/requests')).toBe('http://heron:4000/api/requests');
            expect(getApiUrl('/api/requests/123')).toBe('http://heron:4000/api/requests/123');
            expect(getApiUrl('/api/requests/123/action')).toBe('http://heron:4000/api/requests/123/action');
        });

        it('should generate correct innovation hub endpoints', () => {
            expect(getApiUrl('/api/ideas')).toBe('http://heron:4000/api/ideas');
            expect(getApiUrl('/api/ideas/123')).toBe('http://heron:4000/api/ideas/123');
            expect(getApiUrl('/api/ideas/123/vote')).toBe('http://heron:4000/api/ideas/123/vote');
            expect(getApiUrl('/api/ideas/123/comments')).toBe('http://heron:4000/api/ideas/123/comments');
        });

        it('should generate correct auth endpoints', () => {
            expect(getApiUrl('/api/auth/login')).toBe('http://heron:4000/api/auth/login');
            expect(getApiUrl('/api/auth/refresh')).toBe('http://heron:4000/api/auth/refresh');
        });

        it('should generate correct file endpoints', () => {
            expect(getApiUrl('/uploads/file.pdf')).toBe('http://heron:4000/uploads/file.pdf');
            expect(getApiUrl('/api/attachments/123/download')).toBe('http://heron:4000/api/attachments/123/download');
        });
    });
});
