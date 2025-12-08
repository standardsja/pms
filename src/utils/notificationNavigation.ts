/**
 * Notification Navigation Utility
 * Generates appropriate navigation URLs based on notification type and data
 */

import type { Notification } from '../services/notificationApi';
import { useNavigate } from 'react-router-dom';

/**
 * Generate the navigation URL for a notification based on its type and data
 */
export function getNotificationUrl(notification: Notification): string | null {
    // If notification has explicit URL in data, use it
    if (notification.data?.url) {
        return notification.data.url;
    }

    switch (notification.type) {
        case 'STAGE_CHANGED':
            // For procurement request stage changes, navigate to the request detail
            if (notification.data?.requestId) {
                return `/apps/request/${notification.data.requestId}`;
            }
            break;

        case 'IDEA_APPROVED':
            // For innovation hub ideas
            if (notification.data?.ideaId) {
                return `/innovation/idea/${notification.data.ideaId}`;
            }
            break;

        case 'MENTION':
            // For mentions in innovation hub or other contexts
            if (notification.data?.ideaId) {
                return `/innovation/idea/${notification.data.ideaId}`;
            } else if (notification.data?.requestId) {
                return `/apps/request/${notification.data.requestId}`;
            }
            break;

        case 'THRESHOLD_EXCEEDED':
            // For threshold notifications, go to approvals
            if (notification.data?.requestId) {
                return `/procurement/approvals?requestId=${notification.data.requestId}`;
            }
            return `/procurement/approvals`;

        case 'EVALUATION_VERIFIED':
        case 'EVALUATION_RETURNED':
            // For evaluation notifications
            if (notification.data?.requestId) {
                return `/procurement/evaluation?requestId=${notification.data.requestId}`;
            }
            return `/procurement/evaluation`;

        default:
            return null;
    }

    return null;
}

/**
 * Hook to handle notification click navigation
 */
export function useNotificationNavigation() {
    const navigate = useNavigate();

    const handleNotificationClick = (notification: Notification) => {
        const url = getNotificationUrl(notification);

        if (url) {
            // Navigate to the appropriate page
            navigate(url);
            // Mark as read (optional - can be done separately)
        }
    };

    return { handleNotificationClick, getNotificationUrl };
}
