/**
 * Tests for procurement threshold detection utilities
 */

import { checkExecutiveThreshold, getThresholdBadge, shouldShowThresholdNotification } from '../thresholdUtils';

describe('thresholdUtils', () => {
    describe('checkExecutiveThreshold', () => {
        test('should require executive approval for works over 5M JMD', () => {
            const result = checkExecutiveThreshold(5500000, ['works'], 'JMD');

            expect(result.isRequired).toBe(true);
            expect(result.thresholdType).toBe('works');
            expect(result.level).toBe('warning');
            expect(result.message).toContain('EXECUTIVE DIRECTOR APPROVAL REQUIRED');
            expect(result.message).toContain('Works procurement');
            expect(result.message).toContain('5,500,000');
        });

        test('should require executive approval for goods over 3M JMD', () => {
            const result = checkExecutiveThreshold(3200000, ['goods'], 'JMD');

            expect(result.isRequired).toBe(true);
            expect(result.thresholdType).toBe('goods_services');
            expect(result.level).toBe('warning');
            expect(result.message).toContain('EXECUTIVE DIRECTOR APPROVAL REQUIRED');
            expect(result.message).toContain('Goods/Services procurement');
        });

        test('should require executive approval for services over 3M JMD', () => {
            const result = checkExecutiveThreshold(3100000, ['services'], 'JMD');

            expect(result.isRequired).toBe(true);
            expect(result.thresholdType).toBe('goods_services');
        });

        test('should NOT require executive approval for works under 5M JMD', () => {
            const result = checkExecutiveThreshold(4500000, ['works'], 'JMD');

            expect(result.isRequired).toBe(false);
            expect(result.thresholdType).toBe('none');
            expect(result.level).toBe('info');
        });

        test('should NOT require executive approval for goods under 3M JMD', () => {
            const result = checkExecutiveThreshold(2800000, ['goods'], 'JMD');

            expect(result.isRequired).toBe(false);
            expect(result.thresholdType).toBe('none');
        });

        test('should handle multiple procurement types correctly', () => {
            const result = checkExecutiveThreshold(3500000, ['goods', 'services'], 'JMD');

            expect(result.isRequired).toBe(true);
            expect(result.thresholdType).toBe('goods_services');
        });

        test('should handle mixed types with works taking precedence', () => {
            const result = checkExecutiveThreshold(4000000, ['goods', 'works'], 'JMD');

            expect(result.isRequired).toBe(false); // Under works threshold but over goods threshold
        });

        test('should handle string amounts', () => {
            const result = checkExecutiveThreshold('3500000', ['goods'], 'JMD');

            expect(result.isRequired).toBe(true);
            expect(result.amount).toBe(3500000);
        });

        test('should handle empty procurement types', () => {
            const result = checkExecutiveThreshold(5000000, [], 'JMD');

            expect(result.isRequired).toBe(false);
            expect(result.thresholdType).toBe('none');
        });
    });

    describe('getThresholdBadge', () => {
        test('should return badge for required approval', () => {
            const alert = checkExecutiveThreshold(3500000, ['goods'], 'JMD');
            const badge = getThresholdBadge(alert);

            expect(badge.show).toBe(true);
            expect(badge.text).toBe('Executive Approval Required');
            expect(badge.icon).toBe('⚠️');
            expect(badge.className).toContain('orange');
        });

        test('should not return badge for non-required approval', () => {
            const alert = checkExecutiveThreshold(2000000, ['goods'], 'JMD');
            const badge = getThresholdBadge(alert);

            expect(badge.show).toBe(false);
            expect(badge.text).toBe('');
        });
    });

    describe('shouldShowThresholdNotification', () => {
        test('should show notifications for procurement officers', () => {
            expect(shouldShowThresholdNotification(['PROCUREMENT_OFFICER'])).toBe(true);
            expect(shouldShowThresholdNotification(['PROCUREMENT_MANAGER'])).toBe(true);
            expect(shouldShowThresholdNotification(['PROCUREMENT'])).toBe(true);
        });

        test('should show notifications for admin users', () => {
            expect(shouldShowThresholdNotification(['ADMIN'])).toBe(true);
            expect(shouldShowThresholdNotification(['MANAGER'])).toBe(true);
        });

        test('should show notifications for partial procurement role matches', () => {
            expect(shouldShowThresholdNotification(['SENIOR_PROCUREMENT_SPECIALIST'])).toBe(true);
            expect(shouldShowThresholdNotification(['DEPUTY_PROCUREMENT_OFFICER'])).toBe(true);
        });

        test('should NOT show notifications for non-procurement users', () => {
            expect(shouldShowThresholdNotification(['EMPLOYEE'])).toBe(false);
            expect(shouldShowThresholdNotification(['DEPARTMENT_HEAD'])).toBe(false);
            expect(shouldShowThresholdNotification(['EXECUTIVE_DIRECTOR'])).toBe(false);
        });

        test('should handle mixed roles correctly', () => {
            expect(shouldShowThresholdNotification(['EMPLOYEE', 'PROCUREMENT_OFFICER'])).toBe(true);
            expect(shouldShowThresholdNotification(['EMPLOYEE', 'DEPARTMENT_HEAD'])).toBe(false);
        });

        test('should handle empty or undefined roles', () => {
            expect(shouldShowThresholdNotification([])).toBe(false);
            expect(shouldShowThresholdNotification(undefined)).toBe(false);
        });

        test('should handle roles array containing undefined/null values', () => {
            // @ts-ignore - Testing runtime edge case where roles might contain undefined
            expect(shouldShowThresholdNotification([undefined, 'PROCUREMENT_OFFICER'])).toBe(true);
            // @ts-ignore - Testing runtime edge case where roles might contain null
            expect(shouldShowThresholdNotification([null, 'EMPLOYEE'])).toBe(false);
            // @ts-ignore - Testing runtime edge case where roles might contain empty strings
            expect(shouldShowThresholdNotification(['', 'PROCUREMENT'])).toBe(true);
            // @ts-ignore - Testing runtime edge case where all values are falsy
            expect(shouldShowThresholdNotification([undefined, null, ''])).toBe(false);
        });

        test('should handle case variations', () => {
            expect(shouldShowThresholdNotification(['procurement_officer'])).toBe(true);
            expect(shouldShowThresholdNotification(['Procurement_Manager'])).toBe(true);
        });
    });
});
