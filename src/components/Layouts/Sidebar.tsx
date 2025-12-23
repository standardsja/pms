import PerfectScrollbar from 'react-perfect-scrollbar';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { toggleSidebar } from '../../store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '../../store';
import { useState, useEffect, useMemo } from 'react';
import IconCaretsDown from '../Icon/IconCaretsDown';
import IconCaretDown from '../Icon/IconCaretDown';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMinus from '../Icon/IconMinus';
import IconMenuInvoice from '../Icon/Menu/IconMenuInvoice';
import IconMenuCharts from '../Icon/Menu/IconMenuCharts';
import IconMenuWidgets from '../Icon/Menu/IconMenuWidgets';
import IconMenuFontIcons from '../Icon/Menu/IconMenuFontIcons';
import IconMenuDragAndDrop from '../Icon/Menu/IconMenuDragAndDrop';
import IconMenuTables from '../Icon/Menu/IconMenuTables';
import IconMenuDocumentation from '../Icon/Menu/IconMenuDocumentation';
import IconEdit from '../Icon/IconEdit';
import IconDollarSignCircle from '../Icon/IconDollarSignCircle';
import IconClipboardText from '../Icon/IconClipboardText';
import IconChecks from '../Icon/IconChecks';
import IconFile from '../Icon/IconFile';
import IconShoppingCart from '../Icon/IconShoppingCart';
import IconUsersGroup from '../Icon/IconUsersGroup';
import IconBook from '../Icon/IconBook';
import IconBarChart from '../Icon/IconBarChart';
import IconCreditCard from '../Icon/IconCreditCard';
import IconSettings from '../Icon/IconSettings';
import IconMenuMore from '../Icon/Menu/IconMenuMore';
import IconInbox from '../Icon/IconInbox';
import IconCircleCheck from '../Icon/IconCircleCheck';
import IconThumbUp from '../Icon/IconThumbUp';
import IconPlusCircle from '../Icon/IconPlusCircle';
import IconUser from '../Icon/IconUser';
import IconStar from '../Icon/IconStar';
import { getUser } from '../../utils/auth';
import { detectUserRoles, getDashboardPath } from '../../utils/roleDetection';
import { can, isDeptManagerFor } from '../../utils/permissions';
import IconLock from '../Icon/IconLock';
import { getModuleLocks, type ModuleLockState } from '../../utils/moduleLocks';
import IconBuilding from '../Icon/IconBuilding';
import IconShield from '../Icon/IconShield';
import IconHistory from '../Icon/IconHistory';
import IconDollar from '../Icon/IconDollar';
import IconUsers from '../Icon/IconUsers';
import IconKey from '../Icon/IconKey';
import IconUpload from '../Icon/IconUpload';
import IconGear from '../Icon/IconGear';
import { getApiUrl } from '../../config/api';
import { getToken } from '../../utils/auth';
const Sidebar = () => {
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const [moduleLocks, setModuleLocks] = useState<ModuleLockState>(() => getModuleLocks());
    // Initialize pinnedModule based on module lock status
    const [pinnedModule, setPinnedModule] = useState<string | null>(() => {
        const locks = getModuleLocks();
        // Default to innovation if procurement is locked, otherwise procurement
        if (locks.procurement.locked && !locks.innovation.locked) {
            return 'innovation';
        }
        return 'procurement';
    });
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    // Get current user to check role
    // Memoize to prevent infinite render loops
    const currentUser = useMemo(() => getUser(), []);
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);

    // Use centralized role detection utility
    const detectedRoles = detectUserRoles(userRoles);

    // Convenience aliases for clarity in this component
    const {
        isAdmin,
        isHeadOfDivision,
        isInnovationCommittee,
        isExecutiveDirector,
        isSeniorDirector,
        isDepartmentHead,
        isAuditor,
        isFinanceManager,
        isBudgetManager,
        isFinanceOfficer,
        isFinancePaymentStage,
        isProcurementManager,
        isDepartmentManager,
        isProcurementOfficer,
        isSupplier,
        isRequester,
    } = detectedRoles;

    // Force committee sidebar if route matches /innovation/committee/*
    const isCommitteeRoute = location.pathname.startsWith('/innovation/committee/');
    const showCommitteeSidebar = isInnovationCommittee || isCommitteeRoute;

    const isDeptManagerHere = isDeptManagerFor((currentUser as any)?.department?.code || '');

    const procurementLocked = moduleLocks.procurement.locked;
    const innovationLocked = moduleLocks.innovation.locked;
    const committeeLocked = moduleLocks.committee.locked;

    // Determine if we're in Innovation Hub
    // Priority: If on /innovation route, ALWAYS show innovation sidebar
    // Otherwise, check pinnedModule preference for shared routes
    const isInnovationHub = useMemo(() => {
        if (location.pathname.startsWith('/innovation')) {
            return true; // Always show Innovation sidebar when on Innovation routes
        }
        // For shared routes (profile, settings, etc), use pinned preference
        return pinnedModule === 'innovation';
    }, [location.pathname, pinnedModule]);

    // Only show procurement menus when NOT in innovation hub and not locked
    const showProcurementMenus = useMemo(() => {
        return !isInnovationHub && !procurementLocked;
    }, [isInnovationHub, procurementLocked]);

    // Compute dashboard path for logo/home based on pinnedModule
    const dashboardPath = useMemo(() => {
        // If user has explicitly pinned Innovation Hub, always go there
        if (pinnedModule === 'innovation' && !innovationLocked) {
            return '/innovation/dashboard';
        }
        // Otherwise use role-based detection
        return getDashboardPath(detectedRoles, location.pathname);
    }, [pinnedModule, innovationLocked, detectedRoles, location.pathname]);

    // Debug logging for dashboard path

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    const renderLockNotice = (label: string, reason?: string) => (
        <li className="nav-item px-4 py-3 text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700/40">
            <div className="flex items-center gap-2">
                <IconLock className="w-4 h-4" />
                <span className="font-semibold">{label} locked</span>
            </div>
            {reason && <div className="mt-1 text-[11px] text-red-500 dark:text-red-200">{reason}</div>}
        </li>
    );

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
        // Don't auto-click sidebar items for non-module routes (like /profile, /settings)
        // when a module is locked. This prevents the sidebar from switching away from
        // the locked module display.
    }, []);

    useEffect(() => {
        const syncLocks = () => setModuleLocks(getModuleLocks());
        window.addEventListener('storage', syncLocks);
        return () => window.removeEventListener('storage', syncLocks);
    }, []);

    // Check if pinned module is locked and auto-switch to available module
    useEffect(() => {
        if (!pinnedModule) return;

        const procAvailable = !procurementLocked;
        const innovAvailable = !innovationLocked;

        // If pinned module is locked, switch to available one
        if (pinnedModule === 'procurement' && procurementLocked) {
            if (innovAvailable) {
                setPinnedModule('innovation');
            }
        } else if (pinnedModule === 'innovation' && innovationLocked) {
            if (procAvailable) {
                setPinnedModule('procurement');
            }
        }
    }, [procurementLocked, innovationLocked, pinnedModule]);

    // Fetch pinnedModule from API on component mount
    useEffect(() => {
        const fetchPinnedModule = async () => {
            try {
                const token = getToken();
                const response = await fetch(getApiUrl('/api/auth/me'), {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (response.ok) {
                    const data = await response.json();
                    let moduleToSet = data.pinnedModule || 'procurement';

                    // Validate the fetched module against current lock state
                    const locks = getModuleLocks();
                    if (moduleToSet === 'procurement' && locks.procurement.locked && !locks.innovation.locked) {
                        moduleToSet = 'innovation';
                    } else if (moduleToSet === 'innovation' && locks.innovation.locked && !locks.procurement.locked) {
                        moduleToSet = 'procurement';
                    }

                    setPinnedModule(moduleToSet);
                }
            } catch (error) {
                // Silently fail - use initialized default
            }
        };
        fetchPinnedModule();
    }, []);

    // Save pinnedModule to API whenever it changes
    useEffect(() => {
        if (pinnedModule) {
            const savePinnedModule = async () => {
                try {
                    const token = getToken();
                    await fetch(getApiUrl('/api/auth/me/pinned-module'), {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ pinnedModule }),
                    });
                } catch (error) {
                    // Silently fail - user experience not impacted
                }
            };
            savePinnedModule();
        }
    }, [pinnedModule]);

    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    // Track which module we're in and pin it to the sidebar
    // This prevents the sidebar from changing when navigating to non-module routes like /profile
    useEffect(() => {
        const path = location.pathname;

        // Only update pinnedModule when explicitly navigating TO a module route
        if (path.startsWith('/procurement') || path.startsWith('/apps/requests')) {
            // Only switch to procurement if it's not locked
            if (!procurementLocked) {
                setPinnedModule('procurement');
            }
            // If procurement is locked, don't change pinnedModule - keep current module
        } else if (path.startsWith('/innovation')) {
            // Only switch to innovation if it's not locked
            if (!innovationLocked) {
                setPinnedModule('innovation');
            }
            // If innovation is locked, don't change pinnedModule - keep current module
        }
        // For all other routes (/profile, /settings, /apps, home, etc.), don't change pinnedModule
        // It will remain set to whichever module user is currently viewing
    }, [location.pathname, procurementLocked, innovationLocked]);
    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="bg-white dark:bg-black h-full">
                    <div className="flex justify-between items-center px-4 py-3">
                        <NavLink to={dashboardPath} className="main-logo flex items-center shrink-0" replace>
                            <span className="text-3xl">🌀</span>
                            <span className="text-xl ltr:ml-2 rtl:mr-2 font-bold align-middle lg:inline dark:text-white-light tracking-wider">SPINX</span>
                        </NavLink>

                        <button
                            type="button"
                            className="collapse-icon w-8 h-8 rounded-full flex items-center hover:bg-gray-500/10 dark:hover:bg-dark-light/10 dark:text-white-light transition duration-300 rtl:rotate-180"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    {/* Quick access to onboarding without module selector */}
                    <div className="px-4 pb-3">
                        <NavLink
                            to="/onboarding?from=sidebar"
                            state={{ from: 'sidebar' }}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/15 transition-colors"
                        >
                            <IconMenuMore className="w-5 h-5" />
                            <span>Onboarding</span>
                        </NavLink>
                    </div>

                    <PerfectScrollbar className="h-[calc(100vh-80px)] relative">
                        <ul className="relative font-semibold space-y-0.5 p-4 py-0">
                            {/* Show ADMIN section for admin users only */}
                            {isAdmin && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Admin Dashboard</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Settings & Control</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/modules" className="group">
                                            <div className="flex items-center">
                                                <IconLock className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Module Access Control</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/assign-requests" className="group">
                                            <div className="flex items-center">
                                                <IconUsersGroup className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Assign Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/system-dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconBarChart className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">System Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/departments" className="group">
                                            <div className="flex items-center">
                                                <IconBuilding className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Departments</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/user-security" className="group">
                                            <div className="flex items-center">
                                                <IconShield className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">User Security</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/audit-logs" className="group">
                                            <div className="flex items-center">
                                                <IconHistory className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Audit & Compliance</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/workflow-config" className="group">
                                            <div className="flex items-center">
                                                <IconSettings className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Workflow Config</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/roles-permissions" className="group">
                                            <div className="flex items-center">
                                                <IconKey className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Roles & Permissions</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/bulk-users" className="group">
                                            <div className="flex items-center">
                                                <IconUpload className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Bulk Users</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin/system-config" className="group">
                                            <div className="flex items-center">
                                                <IconGear className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">System Config</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {procurementLocked ? (
                                        renderLockNotice('Procurement module', moduleLocks.procurement.reason)
                                    ) : (
                                        <>
                                            <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                                <IconMinus className="w-4 h-5 flex-none hidden" />
                                                <span>Requests</span>
                                            </h2>

                                            <li className="nav-item">
                                                <NavLink to="/apps/requests" className="group">
                                                    <div className="flex items-center">
                                                        <IconFile className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">All Requests</span>
                                                    </div>
                                                </NavLink>
                                            </li>

                                            <li className="nav-item">
                                                <NavLink to="/apps/requests/combine" className="group">
                                                    <div className="flex items-center">
                                                        <IconPlusCircle className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Combine Requests</span>
                                                    </div>
                                                </NavLink>
                                            </li>

                                            <li className="nav-item">
                                                <NavLink to="/procurement/evaluation" className="group">
                                                    <div className="flex items-center">
                                                        <IconClipboardText className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Evaluations</span>
                                                    </div>
                                                </NavLink>
                                            </li>

                                            <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                                <IconMinus className="w-4 h-5 flex-none hidden" />
                                                <span>Procurement</span>
                                            </h2>

                                            <li className="nav-item">
                                                <NavLink to="/procurement/dashboard" className="group">
                                                    <div className="flex items-center">
                                                        <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Dashboard</span>
                                                    </div>
                                                </NavLink>
                                            </li>

                                            <li className="nav-item">
                                                <NavLink to="/procurement/manager" className="group">
                                                    <div className="flex items-center">
                                                        <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Manager Dashboard</span>
                                                    </div>
                                                </NavLink>
                                            </li>

                                            <li className="nav-item">
                                                <NavLink to="/procurement/manager/requests" className="group">
                                                    <div className="flex items-center">
                                                        <IconFile className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Manager Requests</span>
                                                    </div>
                                                </NavLink>
                                            </li>

                                            <li className="nav-item">
                                                <NavLink to="/procurement/manager/assign" className="group">
                                                    <div className="flex items-center">
                                                        <IconUsersGroup className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Assign Requests</span>
                                                    </div>
                                                </NavLink>
                                            </li>

                                            <li className="nav-item">
                                                <NavLink to="/procurement/manager/settings" className="group">
                                                    <div className="flex items-center">
                                                        <IconSettings className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Load Balancing</span>
                                                    </div>
                                                </NavLink>
                                            </li>
                                        </>
                                    )}

                                    {innovationLocked ? (
                                        renderLockNotice('Innovation Hub', moduleLocks.innovation.reason)
                                    ) : (
                                        <>
                                            <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                                <IconMinus className="w-4 h-5 flex-none hidden" />
                                                <span>Innovation</span>
                                            </h2>

                                            <li className="nav-item">
                                                <NavLink to="/innovation/dashboard" className="group">
                                                    <div className="flex items-center">
                                                        <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Innovation Hub</span>
                                                    </div>
                                                </NavLink>
                                            </li>

                                            {committeeLocked ? (
                                                renderLockNotice('Committee workspace', moduleLocks.committee.reason)
                                            ) : (
                                                <>
                                                    <li className="nav-item">
                                                        <NavLink to="/innovation/committee/dashboard" className="group">
                                                            <div className="flex items-center">
                                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Committee Dashboard</span>
                                                            </div>
                                                        </NavLink>
                                                    </li>

                                                    <li className="nav-item">
                                                        <NavLink to="/innovation/committee/review" className="group">
                                                            <div className="flex items-center">
                                                                <IconCircleCheck className="group-hover:!text-primary shrink-0" />
                                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Review Ideas</span>
                                                            </div>
                                                        </NavLink>
                                                    </li>

                                                    {/* Evaluation Committee removed */}
                                                </>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {/* Show HEAD_OF_DIVISION section for HOD users */}
                            {isHeadOfDivision && !isAdmin && !procurementLocked && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Division Dashboard</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/hod" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show EVALUATION_COMMITTEE section */}
                            {/* Evaluation committee role removed — menu intentionally omitted */}

                            {/* Show INNOVATION_COMMITTEE section (forced by route or role) */}
                            {showCommitteeSidebar && !committeeLocked && (
                                // Innovation Committee Menu
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Committee Dashboard</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/committee/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/committee/review" className="group">
                                            <div className="flex items-center">
                                                <IconCircleCheck className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Review Ideas</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/ideas/browse" className="group">
                                            <div className="flex items-center">
                                                <IconBook className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Browse All Ideas</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/projects" className="group">
                                            <div className="flex items-center">
                                                <IconStar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">BSJ Projects</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/ideas/analytics" className="group">
                                            <div className="flex items-center">
                                                <IconBarChart className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Analytics</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show INNOVATION_HUB section when in innovation context and not a committee member */}
                            {!showCommitteeSidebar && isInnovationHub && (
                                // Innovation Hub Menu
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Innovation Hub</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/ideas/new" className="group">
                                            <div className="flex items-center">
                                                <IconPlusCircle className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Create an Idea</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/ideas/browse" className="group">
                                            <div className="flex items-center">
                                                <IconBook className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Browse Ideas</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/ideas/popular" className="group">
                                            <div className="flex items-center">
                                                <IconThumbUp className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Vote on Ideas</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/ideas/mine" className="group">
                                            <div className="flex items-center">
                                                <IconUser className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">My Ideas</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/projects" className="group">
                                            <div className="flex items-center">
                                                <IconStar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">BSJ Projects</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show SUPPLIER section */}
                            {isSupplier && (
                                // Supplier Only Menu
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>SUPPLIER</span>
                                    </h2>
                                    <li className="nav-item">
                                        <NavLink to="/supplier" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Supplier Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show REQUESTER section - hide for admins; only when procurement is active and unlocked */}
                            {isRequester && !isAdmin && showProcurementMenus && (
                                // Requester Only Menu
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>USER</span>
                                    </h2>
                                    <li className="nav-item">
                                        <NavLink to="/apps/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/procurement/evaluation" className="group">
                                            <div className="flex items-center">
                                                <IconClipboardText className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Evaluation</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show DEPARTMENT_MANAGER section - only when procurement module is active and unlocked */}
                            {(isDepartmentManager || isDeptManagerHere) && !isAdmin && showProcurementMenus && (
                                // Department Manager Menu
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Department Manager</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">My Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests/pending-approval" className="group">
                                            <div className="flex items-center">
                                                <IconInbox className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Pending Approval</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Innovation Hub link removed for Department Manager */}
                                </>
                            )}

                            {/* Show PROCUREMENT_OFFICER section - only when procurement module is active and unlocked */}
                            {isProcurementOfficer && !isAdmin && showProcurementMenus && (
                                // Procurement Officer Only Menu
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>USER</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests/combine" className="group">
                                            <div className="flex items-center">
                                                <IconPlusCircle className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Combine Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Procurement Officer</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/evaluation" className="group">
                                            <div className="flex items-center">
                                                <IconClipboardText className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Evaluation</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/procurement/review" className="group">
                                            <div className="flex items-center">
                                                <IconChecks className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Review</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Note: The following procurement links are intentionally hidden for PROCUREMENT_OFFICER
                                        as per UI requirements: Approvals, Purchase Orders, Suppliers, Catalog, Reports,
                                        Payments, and Settings. Forms remains visible. */}

                                    <li className="nav-item">
                                        <NavLink to="/procurement/forms" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Forms</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show PROCUREMENT_MANAGER section - hide for admins and when in Innovation Hub */}
                            {isProcurementManager && !isAdmin && !isInnovationHub && !procurementLocked && (
                                // Procurement Manager Only Menu
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>USER</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests/combine" className="group">
                                            <div className="flex items-center">
                                                <IconPlusCircle className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Combine Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Procurement Manager</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/manager" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Manager Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/manager/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">All Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/manager/assign" className="group">
                                            <div className="flex items-center">
                                                <IconUsersGroup className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Assign Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/manager/settings" className="group">
                                            <div className="flex items-center">
                                                <IconSettings className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Load Balancing</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* <li className="nav-item">
                                        <NavLink to="/procurement/manager/evaluations-to-validate" className="group">
                                            <div className="flex items-center">
                                                <IconChecks className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Evaluations to Validate</span>
                                            </div>
                                        </NavLink>
                                    </li> */}
                                    <li className="nav-item">
                                        <NavLink to="/procurement/evaluation" className="group">
                                            <div className="flex items-center">
                                                <IconClipboardText className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Evaluation</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/forms" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Forms</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show FINANCE_MANAGER or BUDGET_MANAGER section - limited access to USER and FINANCE only */}
                            {/* Show FINANCE_OFFICER section - limited access to USER and FINANCE only */}
                            {can('VIEW_FINANCE') && !isAdmin && !isProcurementManager && !isInnovationHub && !procurementLocked && (
                                // Finance Menu (permission-based)
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>USER</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Finance</span>
                                    </h2>

                                    <li className="nav-item list-none">
                                        <NavLink to="/finance/requests" className="group">
                                            <div className="flex items-center">
                                                <IconMenuInvoice className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Finance Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {can('APPROVE_PAYMENTS') && (
                                        <li className="nav-item list-none">
                                            <NavLink to="/finance/payments-to-process" className="group">
                                                <div className="flex items-center">
                                                    <IconCreditCard className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Payments to Process</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                    )}
                                </>
                            )}

                            {can('VIEW_FINANCE') && can('APPROVE_PAYMENTS') && !isAdmin && !isProcurementManager && !isInnovationHub && !procurementLocked && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>USER</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Finance</span>
                                    </h2>
                                    <li className="nav-item">
                                        <NavLink to="/finance" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Finance Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="nav-item list-none">
                                        <NavLink to="/finance/requests" className="group">
                                            <div className="flex items-center">
                                                <IconMenuInvoice className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Finance Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="nav-item list-none">
                                        <NavLink to="/finance/awaiting-delivery" className="group">
                                            <div className="flex items-center">
                                                <IconInbox className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Awaiting Delivery Confirmation</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="nav-item list-none">
                                        <NavLink to="/finance/payments-to-process" className="group">
                                            <div className="flex items-center">
                                                <IconCreditCard className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Payments to Process</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show Budget Manager section - same menu as Finance Manager */}
                            {isBudgetManager && !isAdmin && !isInnovationHub && !procurementLocked && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>USER</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Budget Management</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/finance" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Budget Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item list-none">
                                        <NavLink to="/finance/requests" className="group">
                                            <div className="flex items-center">
                                                <IconMenuInvoice className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Budget Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item list-none">
                                        <NavLink to="/finance/awaiting-delivery" className="group">
                                            <div className="flex items-center">
                                                <IconInbox className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Awaiting Delivery Confirmation</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {can('APPROVE_PAYMENTS') && (
                                        <li className="nav-item list-none">
                                            <NavLink to="/finance/payments-to-process" className="group">
                                                <div className="flex items-center">
                                                    <IconCreditCard className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Payments to Process</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                    )}
                                </>
                            )}
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
