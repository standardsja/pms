import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IRootState } from '../../store';
import { toggleRTL, toggleTheme, toggleSidebar } from '../../store/themeConfigSlice';
import { clearModule } from '../../store/moduleSlice';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import Dropdown from '../Dropdown';
import IconMenu from '../Icon/IconMenu';
import IconCalendar from '../Icon/IconCalendar';
import IconEdit from '../Icon/IconEdit';
import IconChatNotification from '../Icon/IconChatNotification';
import IconSearch from '../Icon/IconSearch';
import IconXCircle from '../Icon/IconXCircle';
import IconSun from '../Icon/IconSun';
import IconMoon from '../Icon/IconMoon';
import IconLaptop from '../Icon/IconLaptop';
import IconMailDot from '../Icon/IconMailDot';
import IconArrowLeft from '../Icon/IconArrowLeft';
import IconInfoCircle from '../Icon/IconInfoCircle';
import IconBellBing from '../Icon/IconBellBing';
import IconUser from '../Icon/IconUser';
import IconMail from '../Icon/IconMail';
import IconLockDots from '../Icon/IconLockDots';
import IconLogout from '../Icon/IconLogout';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconCaretDown from '../Icon/IconCaretDown';
import IconMenuApps from '../Icon/Menu/IconMenuApps';
import IconMenuComponents from '../Icon/Menu/IconMenuComponents';
import IconMenuElements from '../Icon/Menu/IconMenuElements';
import IconMenuDatatables from '../Icon/Menu/IconMenuDatatables';
import IconMenuForms from '../Icon/Menu/IconMenuForms';
import IconMenuPages from '../Icon/Menu/IconMenuPages';
import IconMenuMore from '../Icon/Menu/IconMenuMore';
import IconRefresh from '../Icon/IconRefresh';
import { getUser, getToken, clearAuth } from '../../utils/auth';
import { detectUserRoles, getDashboardPath } from '../../utils/roleDetection';
import { heartbeatService } from '../../services/heartbeatService';
import { fetchNotifications, deleteNotification, markNotificationAsRead, Notification } from '../../services/notificationApi';
import { fetchMessages, deleteMessage, Message } from '../../services/messageApi';
import { getApiUrl } from '../../config/api';
import IconLock from '../Icon/IconLock';
import { fetchModuleLocks, getModuleLocks, defaultModuleLockState, type ModuleLockState } from '../../utils/moduleLocks';
import BACKEND from '../../services/adminService';

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Current user & role derivations (align with Sidebar logic)
    // Memoize to prevent infinite render loops
    const currentUser = useMemo(() => getUser(), []);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [moduleLocks, setModuleLocks] = useState<ModuleLockState>(defaultModuleLockState);
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);

    // Use centralized role detection utility
    const detectedRoles = detectUserRoles(userRoles);

    // Convenience aliases for clarity in this component
    const {
        isInnovationCommittee: isCommitteeMember,
        isFinanceManager,
        isProcurementManager,
        isProcurementOfficer,
        isSupplier,
        isExecutiveDirector,
        isSeniorDirector,
        isDepartmentHead,
        isFinancePaymentStage: isFinancePayment,
        isAuditor,
        isRequester,
    } = detectedRoles;

    // Determine current module based on route
    const isInnovationHub = location.pathname.startsWith('/innovation');
    const currentModule = isInnovationHub ? 'innovation' : 'procurement';
    const procurementLocked = moduleLocks.procurement.locked;
    const innovationLocked = moduleLocks.innovation.locked;

    // Set dashboard path based on pinnedModule if available, otherwise role detection
    const [pinnedModule, setPinnedModule] = useState<string | null>(null);

    useEffect(() => {
        const fetchPinnedModule = async () => {
            try {
                const token = getToken();
                const response = await fetch(getApiUrl('/api/auth/me'), {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (response.ok) {
                    const data = await response.json();
                    setPinnedModule(data.pinnedModule || 'procurement');
                }
            } catch (error) {
                // Silently fail
            }
        };
        fetchPinnedModule();
    }, []);

    const dashboardPath = useMemo(() => {
        // If user has explicitly pinned Innovation Hub, always go there
        if (pinnedModule === 'innovation' && !innovationLocked) {
            return '/innovation/dashboard';
        }
        // Otherwise use role-based detection
        return getDashboardPath(detectedRoles, location.pathname);
    }, [pinnedModule, innovationLocked, detectedRoles, location.pathname]);

    useEffect(() => {
        const selector = document.querySelector('ul.horizontal-menu a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
            for (let i = 0; i < all.length; i++) {
                all[0]?.classList.remove('active');
            }
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
                if (ele) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele?.classList.add('active');
                    });
                }
            }
        }
    }, [location]);

    useEffect(() => {
        const syncLocks = () => setModuleLocks(getModuleLocks());
        window.addEventListener('storage', syncLocks);
        return () => window.removeEventListener('storage', syncLocks);
    }, []);

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';

    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

    function createMarkup(messages: any) {
        return { __html: messages };
    }

    // Real-time messages from database
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);

    // Fetch messages on mount and periodically
    const loadMessages = async () => {
        setMessagesLoading(true);
        try {
            const data = await fetchMessages();
            setMessages(data);
        } catch (error) {
            // Silently handle errors - messages will be empty
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    };

    const removeMessage = async (id: number) => {
        const success = await deleteMessage(id);
        if (success) {
            setMessages(messages.filter((m) => m.id !== id));
        }
    };

    // Real-time notifications from database
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);

    // Fetch notifications on mount and periodically
    const loadNotifications = async () => {
        setNotificationsLoading(true);
        try {
            const data = await fetchNotifications();
            setNotifications(data);
        } catch (error) {
            // Silently handle errors - notifications will be empty
            setNotifications([]);
        } finally {
            setNotificationsLoading(false);
        }
    };

    // Fetch module locks from API
    const loadModuleLocks = async () => {
        try {
            const locks = await fetchModuleLocks();
            setModuleLocks(locks);
        } catch (error) {
            console.error('Failed to fetch module locks:', error);
        }
    };

    // Initial load and polling (60s interval, matching Innovation Hub pattern)
    useEffect(() => {
        // Get fresh auth data on every effect run
        const token = getToken();
        const user = getUser();

        if (!user || !token) {
            return;
        }

        loadNotifications();
        loadMessages();
        loadModuleLocks();
        loadNavigationMenus();

        // Normalize profile image URL with API base and cache buster
        const resolveProfileImageUrl = (raw?: string | null) => {
            if (!raw) return null;
            const absolute = raw.startsWith('http') ? raw : getApiUrl(raw);
            const separator = absolute.includes('?') ? '&' : '?';
            return `${absolute}${separator}t=${Date.now()}`;
        };

        // Fetch user profile image
        const loadProfileImage = async () => {
            try {
                const response = await fetch(getApiUrl('/api/auth/me'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();

                    // Fallback: if profileImage is missing, fetch from dedicated endpoint
                    if (!data.profileImage) {
                        try {
                            const photoResponse = await fetch(getApiUrl('/api/auth/profile-photo'), {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            });
                            if (photoResponse.ok) {
                                const photoData = await photoResponse.json();
                                if (photoData.success && photoData.data?.profileImage) {
                                    data.profileImage = photoData.data.profileImage;
                                }
                            }
                        } catch (error) {
                            console.warn('Could not fetch profile photo:', error);
                        }
                    }

                    setProfileImage(resolveProfileImageUrl(data.profileImage));
                } else {
                }
            } catch (error) {}
        };

        loadProfileImage();

        // Listen for profile photo updates
        const handleProfilePhotoUpdate = (event: CustomEvent) => {
            if (event.detail?.profileImage) {
                setProfileImage(resolveProfileImageUrl(event.detail.profileImage));
            }
        };

        window.addEventListener('profilePhotoUpdated', handleProfilePhotoUpdate as EventListener);

        // Poll for new data every 60 seconds
        const pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadNotifications();
                loadMessages();
            }
        }, 60000);

        // Refresh when tab becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadNotifications();
                loadMessages();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('profilePhotoUpdated', handleProfilePhotoUpdate as EventListener);
        };
    }, []);
    const removeNotification = async (id: number) => {
        const success = await deleteNotification(id);
        if (success) {
            setNotifications(notifications.filter((n) => n.id !== id));
        }
    };

    // Format relative time
    const getRelativeTime = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return '1 day ago';
        return `${diffDays} days ago`;
    };

    const [search, setSearch] = useState(false);

    // Navigation Menu Items
    const [navigationMenus, setNavigationMenus] = useState<any[]>([]);
    const [menusLoading, setMenusLoading] = useState(false);

    // Fetch navigation menus from database
    const loadNavigationMenus = async () => {
        setMenusLoading(true);
        try {
            const menus = await BACKEND.getNavigationMenus();
            setNavigationMenus(menus);
        } catch (error) {
            console.error('Failed to load navigation menus:', error);
            // Fallback to default menus
            setNavigationMenus([
                { id: 1, menuId: 'my-profile', label: 'My Profile', icon: 'IconUser', path: '/profile' },
                { id: 2, menuId: 'account-settings', label: 'Account Settings', icon: 'settings', path: '/settings' },
                { id: 3, menuId: 'help-support', label: 'Help & Support', icon: 'IconInfoCircle', path: '/help' },
            ]);
        } finally {
            setMenusLoading(false);
        }
    };

    const setLocale = (flag: string) => {
        setFlag(flag);
        if (flag.toLowerCase() === 'ae') {
            dispatch(toggleRTL('rtl'));
        } else {
            dispatch(toggleRTL('ltr'));
        }
    };
    const [flag, setFlag] = useState(themeConfig.locale);

    const { t } = useTranslation();

    return (
        <header className={`z-40 ${themeConfig.semidark && themeConfig.menu === 'horizontal' ? 'dark' : ''}`}>
            <div className="shadow-sm">
                <div className="relative bg-white flex w-full items-center px-5 py-2.5 dark:bg-black">
                    <div className="horizontal-logo flex lg:hidden justify-between items-center ltr:mr-2 rtl:ml-2">
                        <Link to={dashboardPath} className="main-logo flex items-center shrink-0" title="Home" replace>
                            <span className="text-2xl">🌀</span>
                            <span className="text-lg ltr:ml-1.5 rtl:mr-1.5 font-bold align-middle hidden md:inline dark:text-white-light transition-all duration-300 tracking-wider">SPINX</span>
                        </Link>
                        <button
                            type="button"
                            className="collapse-icon flex-none dark:text-[#d0d2d6] hover:text-primary dark:hover:text-primary flex lg:hidden ltr:ml-2 rtl:mr-2 p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:bg-white-light/90 dark:hover:bg-dark/60"
                            onClick={() => {
                                dispatch(toggleSidebar());
                            }}
                        >
                            <IconMenu className="w-5 h-5" />
                        </button>
                    </div>

                    {!isInnovationHub && !isSupplier && !procurementLocked && (
                        <div className="ltr:mr-2 rtl:ml-2 hidden sm:block">
                            <ul className="flex items-center space-x-2 rtl:space-x-reverse dark:text-[#d0d2d6]">
                                <li>
                                    <Link
                                        to={dashboardPath}
                                        className="block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60"
                                        title="Dashboard Home"
                                        replace
                                    >
                                        <IconMenuDashboard />
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    )}
                    <div className="sm:flex-1 ltr:sm:ml-0 ltr:ml-auto sm:rtl:mr-0 rtl:mr-auto flex items-center space-x-1.5 lg:space-x-2 rtl:space-x-reverse dark:text-[#d0d2d6]">
                        <div className="sm:ltr:mr-auto sm:rtl:ml-auto">{/* Hidden search bar to maintain spacing */}</div>
                        {/* Module switch removed: header reflects current module only */}
                        <div>
                            {themeConfig.theme === 'light' ? (
                                <button
                                    className={`${
                                        themeConfig.theme === 'light' &&
                                        'flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60'
                                    }`}
                                    onClick={() => {
                                        dispatch(toggleTheme('dark'));
                                    }}
                                >
                                    <IconSun />
                                </button>
                            ) : (
                                ''
                            )}
                            {themeConfig.theme === 'dark' && (
                                <button
                                    className={`${
                                        themeConfig.theme === 'dark' &&
                                        'flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60'
                                    }`}
                                    onClick={() => {
                                        dispatch(toggleTheme('system'));
                                    }}
                                >
                                    <IconMoon />
                                </button>
                            )}
                            {themeConfig.theme === 'system' && (
                                <button
                                    className={`${
                                        themeConfig.theme === 'system' &&
                                        'flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60'
                                    }`}
                                    onClick={() => {
                                        dispatch(toggleTheme('light'));
                                    }}
                                >
                                    <IconLaptop />
                                </button>
                            )}
                        </div>
                        <div className="shrink-0">
                            <div className="flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40">
                                <img className="w-5 h-5 object-cover rounded-full" src={`/assets/images/flags/JM.svg`} alt="Jamaica" />
                                <span className="ltr:ml-2 rtl:mr-2 text-sm font-semibold">EN</span>
                            </div>
                        </div>
                        <div className="dropdown shrink-0">
                            <Dropdown
                                offset={[0, 8]}
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="relative block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60"
                                button={
                                    <span>
                                        <IconMailDot />
                                        {messages.filter((m) => !m.readAt).length > 0 && (
                                            <span className="flex absolute w-3 h-3 ltr:right-0 rtl:left-0 top-0">
                                                <span className="animate-ping absolute ltr:-left-[3px] rtl:-right-[3px] -top-[3px] inline-flex h-full w-full rounded-full bg-success/50 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full w-[6px] h-[6px] bg-success"></span>
                                            </span>
                                        )}
                                    </span>
                                }
                            >
                                <ul className="!py-0 text-dark dark:text-white-dark w-[300px] sm:w-[375px] text-xs">
                                    <li className="mb-5" onClick={(e) => e.stopPropagation()}>
                                        <div className="hover:!bg-transparent overflow-hidden relative rounded-t-md p-5 text-white w-full !h-[68px]">
                                            <div
                                                className="absolute h-full w-full bg-no-repeat bg-center bg-cover inset-0 bg-"
                                                style={{
                                                    backgroundImage: `url('/assets/images/menu-heade.jpg')`,
                                                    backgroundRepeat: 'no-repeat',
                                                    width: '100%',
                                                    height: '100%',
                                                }}
                                            ></div>
                                            <h4 className="font-semibold relative z-10 text-lg">
                                                Messages
                                                {messages.filter((m) => !m.readAt).length > 0 && <span className="ml-2 badge bg-white/20">{messages.filter((m) => !m.readAt).length} unread</span>}
                                            </h4>
                                        </div>
                                    </li>
                                    {messagesLoading && messages.length === 0 ? (
                                        <li onClick={(e) => e.stopPropagation()}>
                                            <div className="!grid place-content-center hover:!bg-transparent text-lg min-h-[200px]">
                                                <div className="mx-auto">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                </div>
                                            </div>
                                        </li>
                                    ) : messages.length > 0 ? (
                                        <>
                                            <li onClick={(e) => e.stopPropagation()}>
                                                {messages.map((message) => {
                                                    const isUnread = !message.readAt;
                                                    return (
                                                        <div key={message.id} className={`flex items-center py-3 px-5 hover:bg-gray-50 dark:hover:bg-gray-800 ${isUnread ? 'bg-primary/5' : ''}`}>
                                                            <div className="flex-shrink-0">
                                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                                    <span className="text-lg">✉️</span>
                                                                </div>
                                                            </div>
                                                            <span className="px-3 dark:text-gray-500 flex-1">
                                                                <div className={`font-semibold text-sm dark:text-white-light/90 ${isUnread ? 'font-bold' : ''}`}>{message.subject}</div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">From: {message.fromUser?.name || 'Unknown'}</div>
                                                                <div className="text-xs mt-1 line-clamp-2">{message.body}</div>
                                                            </span>
                                                            <div className="flex flex-col items-end gap-2">
                                                                <span className="font-semibold bg-white-dark/20 rounded text-dark/60 px-1 whitespace-pre dark:text-white-dark text-xs">
                                                                    {getRelativeTime(message.createdAt)}
                                                                </span>
                                                                <button type="button" className="text-neutral-300 hover:text-danger" onClick={() => removeMessage(message.id)}>
                                                                    <IconXCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </li>
                                            <li className="border-t border-white-light text-center dark:border-white/10 mt-5">
                                                <button
                                                    type="button"
                                                    className="text-primary font-semibold group dark:text-gray-400 justify-center !py-4 !h-[48px]"
                                                    onClick={loadMessages}
                                                    disabled={messagesLoading}
                                                >
                                                    <span className="group-hover:underline ltr:mr-1 rtl:ml-1">{messagesLoading ? 'REFRESHING...' : 'REFRESH MESSAGES'}</span>
                                                    {!messagesLoading && <IconArrowLeft className="group-hover:translate-x-1 transition duration-300 ltr:ml-1 rtl:mr-1" />}
                                                </button>
                                            </li>
                                        </>
                                    ) : (
                                        <li className="mb-5" onClick={(e) => e.stopPropagation()}>
                                            <button type="button" className="!grid place-content-center hover:!bg-transparent text-lg min-h-[200px]">
                                                <div className="mx-auto ring-4 ring-primary/30 rounded-full mb-4 text-primary">
                                                    <IconInfoCircle fill={true} className="w-10 h-10" />
                                                </div>
                                                No messages yet.
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </Dropdown>
                        </div>
                        <div className="dropdown shrink-0">
                            <Dropdown
                                offset={[0, 8]}
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="relative block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60"
                                button={
                                    <span>
                                        <IconBellBing />
                                        {notifications.filter((n) => !n.readAt).length > 0 && (
                                            <span className="flex absolute w-3 h-3 ltr:right-0 rtl:left-0 top-0">
                                                <span className="animate-ping absolute ltr:-left-[3px] rtl:-right-[3px] -top-[3px] inline-flex h-full w-full rounded-full bg-success/50 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full w-[6px] h-[6px] bg-success"></span>
                                            </span>
                                        )}
                                    </span>
                                }
                            >
                                <ul className="!py-0 text-dark dark:text-white-dark w-[300px] sm:w-[350px] divide-y dark:divide-white/10">
                                    <li onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center px-4 py-2 justify-between font-semibold">
                                            <h4 className="text-lg">Notifications</h4>
                                            {notifications.length ? <span className="badge bg-primary/80">{notifications.filter((n) => !n.readAt).length} New</span> : null}
                                        </div>
                                    </li>
                                    <li className="!py-0 !divide-y-0 max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                        {notificationsLoading && notifications.length === 0 ? (
                                            <div className="!grid place-content-center hover:!bg-transparent text-lg min-h-[200px]">
                                                <div className="mx-auto">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                </div>
                                            </div>
                                        ) : notifications.length > 0 ? (
                                            <ul className="!py-0 divide-y dark:divide-white/10">
                                                {notifications.map((notification) => {
                                                    const isUnread = !notification.readAt;
                                                    const notificationTypeIcons: Record<
                                                        'MENTION' | 'STAGE_CHANGED' | 'IDEA_APPROVED' | 'THRESHOLD_EXCEEDED' | 'EVALUATION_VERIFIED' | 'EVALUATION_RETURNED',
                                                        string
                                                    > = {
                                                        MENTION: '👤',
                                                        STAGE_CHANGED: '🔄',
                                                        IDEA_APPROVED: '✅',
                                                        THRESHOLD_EXCEEDED: '⚠️',
                                                        EVALUATION_VERIFIED: '📝',
                                                        EVALUATION_RETURNED: '↩️',
                                                    };
                                                    const icon = notificationTypeIcons[notification.type] ?? '🔔';

                                                    const handleNotificationClick = () => {
                                                        // Mark as read
                                                        if (isUnread) {
                                                            markNotificationAsRead(notification.id);
                                                            setNotifications(notifications.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)));
                                                        }

                                                        // Navigate based on notification type and data
                                                        try {
                                                            if (notification.data?.requestId) {
                                                                navigate(`/apps/requests/edit/${notification.data.requestId}`);
                                                            } else if (notification.data?.evaluationId) {
                                                                navigate(`/procurement/evaluation/${notification.data.evaluationId}`);
                                                            } else if (notification.data?.combinedRequestId) {
                                                                navigate(`/apps/requests/combined/${notification.data.combinedRequestId}`);
                                                            } else if (notification.data?.innovationId) {
                                                                navigate(`/innovation-hub/ideas/${notification.data.innovationId}`);
                                                            }
                                                        } catch (err) {
                                                            console.error('Error navigating from notification:', err);
                                                        }
                                                    };

                                                    return (
                                                        <li
                                                            key={notification.id}
                                                            className={`dark:text-white-light/90 cursor-pointer transition-colors hover:bg-primary/10 ${isUnread ? 'bg-primary/5' : ''}`}
                                                            onClick={handleNotificationClick}
                                                        >
                                                            <div className="group flex items-center px-4 py-2">
                                                                <div className="grid place-content-center rounded">
                                                                    <div className="w-12 h-12 relative flex items-center justify-center bg-primary/10 rounded-full text-2xl">
                                                                        {icon}
                                                                        {isUnread && <span className="bg-success w-2 h-2 rounded-full block absolute right-0 bottom-0"></span>}
                                                                    </div>
                                                                </div>
                                                                <div className="ltr:pl-3 rtl:pr-3 flex flex-auto">
                                                                    <div className="ltr:pr-3 rtl:pl-3">
                                                                        <h6 className={isUnread ? 'font-semibold' : ''}>{notification.message}</h6>
                                                                        <span className="text-xs block font-normal dark:text-gray-500">{getRelativeTime(notification.createdAt)}</span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className="ltr:ml-auto rtl:mr-auto text-neutral-300 hover:text-danger opacity-0 group-hover:opacity-100"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            removeNotification(notification.id);
                                                                        }}
                                                                    >
                                                                        <IconXCircle />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <button type="button" className="!grid place-content-center hover:!bg-transparent text-lg min-h-[200px] w-full">
                                                <div className="mx-auto ring-4 ring-primary/30 rounded-full mb-4 text-primary">
                                                    <IconInfoCircle fill={true} className="w-10 h-10" />
                                                </div>
                                                No notifications yet.
                                            </button>
                                        )}
                                    </li>
                                    <li onClick={(e) => e.stopPropagation()}>
                                        <div className="p-4">
                                            <button className="btn btn-primary block w-full btn-small" onClick={loadNotifications} disabled={notificationsLoading}>
                                                {notificationsLoading ? 'Refreshing...' : 'Refresh Notifications'}
                                            </button>
                                        </div>
                                    </li>
                                </ul>
                            </Dropdown>
                        </div>
                        <div className="dropdown shrink-0">
                            <Dropdown
                                offset={[0, 8]}
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="relative group block"
                                button={
                                    profileImage ? (
                                        <img
                                            className="w-9 h-9 rounded-full object-cover saturate-50 group-hover:saturate-100"
                                            src={profileImage.startsWith('http') ? profileImage : getApiUrl(profileImage)}
                                            alt="userProfile"
                                            onError={(e) => {
                                                const img = e.target as HTMLImageElement;
                                                img.style.display = 'none';
                                                setProfileImage(null);
                                            }}
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center saturate-50 group-hover:saturate-100">
                                            <span className="text-sm text-gray-600 dark:text-gray-300 font-semibold">{currentUser?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                        </div>
                                    )
                                }
                            >
                                <ul className="text-dark dark:text-white-dark !py-0 w-[230px] font-semibold dark:text-white-light/90">
                                    <li>
                                        <div className="flex items-center px-4 py-4">
                                            {profileImage ? (
                                                <img
                                                    className="rounded-md w-10 h-10 object-cover"
                                                    src={profileImage.startsWith('http') ? profileImage : getApiUrl(profileImage)}
                                                    alt="userProfile"
                                                    onError={(e) => {
                                                        const img = e.target as HTMLImageElement;
                                                        img.style.display = 'none';
                                                        setProfileImage(null);
                                                    }}
                                                />
                                            ) : (
                                                <div className="rounded-md w-10 h-10 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                    <span className="text-lg text-gray-600 dark:text-gray-300 font-semibold">{currentUser?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                                </div>
                                            )}
                                            <div className="ltr:pl-4 rtl:pr-4">
                                                <h4 className="text-base">{currentUser?.name || 'User'}</h4>
                                                <button type="button" className="text-black/60 hover:text-primary dark:text-dark-light/60 dark:hover:text-white text-xs">
                                                    {currentUser?.email || 'user@bsj.gov.jm'}
                                                </button>
                                                {currentUser?.roles && currentUser.roles.length > 0 && (
                                                    <span className="text-xs bg-blue-500 dark:bg-blue-600 rounded text-white px-2 py-0.5 font-bold whitespace-nowrap w-fit mt-1">
                                                        {currentUser.roles
                                                            .map((r: any) => {
                                                                if (typeof r === 'string') return r;
                                                                if (r.role?.name) return r.role.name;
                                                                return r.name || 'User';
                                                            })
                                                            .join(', ')
                                                            .split(',')[0]
                                                            .trim()
                                                            .substring(0, 15)}
                                                    </span>
                                                )}
                                                {(!currentUser?.roles || currentUser.roles.length === 0) && (
                                                    <span className="text-xs bg-success-light rounded text-success px-1 whitespace-nowrap w-fit mt-1">
                                                        {isCommitteeMember
                                                            ? 'Committee'
                                                            : isProcurementManager
                                                            ? 'Procurement Manager'
                                                            : isSupplier
                                                            ? 'Supplier'
                                                            : isRequester
                                                            ? 'User'
                                                            : 'Procurement Officer'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                    {navigationMenus.length > 0 ? (
                                        navigationMenus.map((menu) => (
                                            <li key={menu.id}>
                                                <Link to={menu.path} className="dark:hover:text-white">
                                                    {menu.menuId === 'my-profile' && <IconUser className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0" />}
                                                    {menu.menuId === 'account-settings' && (
                                                        <svg className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"></circle>
                                                            <path
                                                                d="M13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74457 2.35523 9.35522 2.74458 9.15223 3.23463C9.05957 3.45834 9.0233 3.7185 9.00911 4.09799C8.98826 4.65568 8.70226 5.17189 8.21894 5.45093C7.73564 5.72996 7.14559 5.71954 6.65219 5.45876C6.31645 5.2813 6.07301 5.18262 5.83294 5.15102C5.30704 5.08178 4.77518 5.22429 4.35436 5.5472C4.03874 5.78938 3.80577 6.1929 3.33983 6.99993C2.87389 7.80697 2.64092 8.21048 2.58899 8.60491C2.51976 9.1308 2.66227 9.66266 2.98518 10.0835C3.13256 10.2756 3.3397 10.437 3.66119 10.639C4.1338 10.936 4.43789 11.4419 4.43786 12C4.43783 12.5581 4.13375 13.0639 3.66118 13.3608C3.33965 13.5629 3.13248 13.7244 2.98508 13.9165C2.66217 14.3373 2.51966 14.8691 2.5889 15.395C2.64082 15.7894 2.87379 16.193 3.33973 17C3.80568 17.807 4.03865 18.2106 4.35426 18.4527C4.77508 18.7756 5.30694 18.9181 5.83284 18.8489C6.07289 18.8173 6.31632 18.7186 6.65204 18.5412C7.14547 18.2804 7.73556 18.27 8.2189 18.549C8.70224 18.8281 8.98826 19.3443 9.00911 19.9021C9.02331 20.2815 9.05957 20.5417 9.15223 20.7654C9.35522 21.2554 9.74457 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8477 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.902C15.0117 19.3443 15.2977 18.8281 15.781 18.549C16.2643 18.2699 16.8544 18.2804 17.3479 18.5412C17.6836 18.7186 17.927 18.8172 18.167 18.8488C18.6929 18.9181 19.2248 18.7756 19.6456 18.4527C19.9612 18.2105 20.1942 17.807 20.6601 16.9999C21.1261 16.1929 21.3591 15.7894 21.411 15.395C21.4802 14.8691 21.3377 14.3372 21.0148 13.9164C20.8674 13.7243 20.6602 13.5628 20.3387 13.3608C19.8662 13.0639 19.5621 12.558 19.5621 11.9999C19.5621 11.4418 19.8662 10.9361 20.3387 10.6392C20.6603 10.4371 20.8675 10.2757 21.0149 10.0835C21.3378 9.66273 21.4803 9.13087 21.4111 8.60497C21.3592 8.21055 21.1262 7.80703 20.6602 7C20.1943 6.19297 19.9613 5.78945 19.6457 5.54727C19.2249 5.22436 18.693 5.08185 18.1671 5.15109C17.9271 5.18269 17.6837 5.28136 17.3479 5.4588C16.8545 5.71959 16.2644 5.73002 15.7811 5.45096C15.2977 5.17191 15.0117 4.65566 14.9909 4.09794C14.9767 3.71848 14.9404 3.45833 14.8477 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224Z"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                            ></path>
                                                        </svg>
                                                    )}
                                                    {menu.menuId === 'help-support' && <IconInfoCircle className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0" />}
                                                    {menu.label}
                                                </Link>
                                            </li>
                                        ))
                                    ) : (
                                        <>
                                            <li>
                                                <Link to="/profile" className="dark:hover:text-white">
                                                    <IconUser className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0" />
                                                    My Profile
                                                </Link>
                                            </li>
                                            <li>
                                                <Link to="/settings" className="dark:hover:text-white">
                                                    <svg className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"></circle>
                                                        <path
                                                            d="M13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74457 2.35523 9.35522 2.74458 9.15223 3.23463C9.05957 3.45834 9.0233 3.7185 9.00911 4.09799C8.98826 4.65568 8.70226 5.17189 8.21894 5.45093C7.73564 5.72996 7.14559 5.71954 6.65219 5.45876C6.31645 5.2813 6.07301 5.18262 5.83294 5.15102C5.30704 5.08178 4.77518 5.22429 4.35436 5.5472C4.03874 5.78938 3.80577 6.1929 3.33983 6.99993C2.87389 7.80697 2.64092 8.21048 2.58899 8.60491C2.51976 9.1308 2.66227 9.66266 2.98518 10.0835C3.13256 10.2756 3.3397 10.437 3.66119 10.639C4.1338 10.936 4.43789 11.4419 4.43786 12C4.43783 12.5581 4.13375 13.0639 3.66118 13.3608C3.33965 13.5629 3.13248 13.7244 2.98508 13.9165C2.66217 14.3373 2.51966 14.8691 2.5889 15.395C2.64082 15.7894 2.87379 16.193 3.33973 17C3.80568 17.807 4.03865 18.2106 4.35426 18.4527C4.77508 18.7756 5.30694 18.9181 5.83284 18.8489C6.07289 18.8173 6.31632 18.7186 6.65204 18.5412C7.14547 18.2804 7.73556 18.27 8.2189 18.549C8.70224 18.8281 8.98826 19.3443 9.00911 19.9021C9.02331 20.2815 9.05957 20.5417 9.15223 20.7654C9.35522 21.2554 9.74457 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8477 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.902C15.0117 19.3443 15.2977 18.8281 15.781 18.549C16.2643 18.2699 16.8544 18.2804 17.3479 18.5412C17.6836 18.7186 17.927 18.8172 18.167 18.8488C18.6929 18.9181 19.2248 18.7756 19.6456 18.4527C19.9612 18.2105 20.1942 17.807 20.6601 16.9999C21.1261 16.1929 21.3591 15.7894 21.411 15.395C21.4802 14.8691 21.3377 14.3372 21.0148 13.9164C20.8674 13.7243 20.6602 13.5628 20.3387 13.3608C19.8662 13.0639 19.5621 12.558 19.5621 11.9999C19.5621 11.4418 19.8662 10.9361 20.3387 10.6392C20.6603 10.4371 20.8675 10.2757 21.0149 10.0835C21.3378 9.66273 21.4803 9.13087 21.4111 8.60497C21.3592 8.21055 21.1262 7.80703 20.6602 7C20.1943 6.19297 19.9613 5.78945 19.6457 5.54727C19.2249 5.22436 18.693 5.08185 18.1671 5.15109C17.9271 5.18269 17.6837 5.28136 17.3479 5.4588C16.8545 5.71959 16.2644 5.73002 15.7811 5.45096C15.2977 5.17191 15.0117 4.65566 14.9909 4.09794C14.9767 3.71848 14.9404 3.45833 14.8477 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224Z"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                        ></path>
                                                    </svg>
                                                    Account Settings
                                                </Link>
                                            </li>
                                            <li>
                                                <Link to="/help" className="dark:hover:text-white">
                                                    <IconInfoCircle className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0" />
                                                    Help & Support
                                                </Link>
                                            </li>
                                        </>
                                    )}
                                    <li className="border-t border-white-light dark:border-white-light/10">
                                        <Link
                                            to="/auth/login"
                                            className="text-danger !py-3"
                                            onClick={() => {
                                                try {
                                                    heartbeatService.stopHeartbeat();
                                                    clearAuth();
                                                    dispatch(clearModule());
                                                } catch {}
                                            }}
                                        >
                                            <IconLogout className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 rotate-90 shrink-0" />
                                            Sign Out
                                        </Link>
                                    </li>
                                </ul>
                            </Dropdown>
                        </div>
                    </div>
                </div>

                {/* horizontal menu */}
                <ul className="horizontal-menu hidden py-1.5 font-semibold px-6 lg:space-x-1.5 xl:space-x-8 rtl:space-x-reverse bg-white border-t border-[#ebedf2] dark:border-[#191e3a] dark:bg-black text-black dark:text-white-dark">
                    <li className="menu nav-item relative">
                        <NavLink to={dashboardPath} className="nav-link">
                            <div className="flex items-center">
                                <IconMenuDashboard className="shrink-0" />
                                <span className="px-1">Dashboard</span>
                            </div>
                        </NavLink>
                    </li>
                    {!procurementLocked && (
                        <li className="menu nav-item relative">
                            <button type="button" className="nav-link">
                                <div className="flex items-center">
                                    <svg className="shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            d="M2 3L2 21M22 3V21M11.8 20H12.2C13.8802 20 14.7202 20 15.362 19.673C15.9265 19.3854 16.3854 18.9265 16.673 18.362C17 17.7202 17 16.8802 17 15.2V8.8C17 7.11984 17 6.27976 16.673 5.63803C16.3854 5.07354 15.9265 4.6146 15.362 4.32698C14.7202 4 13.8802 4 12.2 4H11.8C10.1198 4 9.27976 4 8.63803 4.32698C8.07354 4.6146 7.6146 5.07354 7.32698 5.63803C7 6.27976 7 7.11984 7 8.8V15.2C7 16.8802 7 17.7202 7.32698 18.362C7.6146 18.9265 8.07354 19.3854 8.63803 19.673C9.27976 20 10.1198 20 11.8 20Z"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <span className="px-1">Procurement</span>
                                </div>
                                <div className="right_arrow">
                                    <IconCaretDown />
                                </div>
                            </button>
                            <ul className="sub-menu">
                                <li>
                                    <NavLink to="/procurement/quotes">Quotes</NavLink>
                                </li>
                                <li>
                                    <NavLink to="/procurement/evaluation">Evaluation</NavLink>
                                </li>
                                <li>
                                    <NavLink to="/procurement/review">Review</NavLink>
                                </li>
                                <li>
                                    <NavLink to="/procurement/purchase-orders">Purchase Orders</NavLink>
                                </li>
                                <li>
                                    <NavLink to="/procurement/suppliers">Suppliers</NavLink>
                                </li>
                                <li>
                                    <NavLink to="/procurement/catalog">Catalog</NavLink>
                                </li>
                                <li>
                                    <NavLink to="/procurement/reports">Reports</NavLink>
                                </li>
                                <li>
                                    <NavLink to="/procurement/payments">Payments</NavLink>
                                </li>
                                <li>
                                    <NavLink to="/procurement/admin">Settings</NavLink>
                                </li>
                            </ul>
                        </li>
                    )}
                    <li className="menu nav-item relative">
                        <NavLink to="/charts" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuComponents className="shrink-0" />
                                <span className="px-1">{t('charts')}</span>
                            </div>
                        </NavLink>
                    </li>
                    <li className="menu nav-item relative">
                        <NavLink to="/tables" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuDatatables className="shrink-0" />
                                <span className="px-1">{t('tables')}</span>
                            </div>
                        </NavLink>
                    </li>
                    <li className="menu nav-item relative">
                        <NavLink to="/widgets" className="nav-link">
                            <div className="flex items-center">
                                <IconMenuMore className="shrink-0" />
                                <span className="px-1">{t('widgets')}</span>
                            </div>
                        </NavLink>
                    </li>
                </ul>
            </div>
        </header>
    );
};

export default Header;
