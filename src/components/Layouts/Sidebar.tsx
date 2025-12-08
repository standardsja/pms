import PerfectScrollbar from 'react-perfect-scrollbar';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { toggleSidebar } from '../../store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '../../store';
import { useState, useEffect } from 'react';
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

const Sidebar = () => {
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const [moduleLocks, setModuleLocks] = useState<ModuleLockState>(getModuleLocks());
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    // Get current user to check role
    const currentUser = getUser();
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);

    // Use centralized role detection utility
    const detectedRoles = detectUserRoles(userRoles);

    // Convenience aliases for clarity in this component
    const {
        isAdmin,
        isHeadOfDivision,
        isCommitteeMember: isInnovationCommittee,
        isEvaluationCommittee,
        isExecutiveDirector,
        isSeniorDirector,
        isDepartmentHead,
        isAuditor,
        isFinanceManager,
        isFinanceOfficer,
        isFinancePaymentStage,
        isProcurementManager,
        isDepartmentManager,
        isProcurementOfficer,
        isSupplier,
        isRequester,
    } = detectedRoles;

    const isDeptManagerHere = isDeptManagerFor((currentUser as any)?.department?.code || '');

    // Determine if we're in Innovation Hub
    const isInnovationHub = location.pathname.startsWith('/innovation');

    const procurementLocked = moduleLocks.procurement.locked;
    const innovationLocked = moduleLocks.innovation.locked;
    const committeeLocked = moduleLocks.committee.locked;

    // Compute dashboard path for logo/home using centralized utility
    const dashboardPath = getDashboardPath(detectedRoles, location.pathname);

    // Debug logging for dashboard path
    console.log('[SIDEBAR] User roles:', userRoles);
    console.log('[SIDEBAR] Detected roles:', detectedRoles);
    console.log('[SIDEBAR] Dashboard path:', dashboardPath);

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
    }, []);

    useEffect(() => {
        const syncLocks = () => setModuleLocks(getModuleLocks());
        window.addEventListener('storage', syncLocks);
        return () => window.removeEventListener('storage', syncLocks);
    }, []);

    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

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
                                        <NavLink to="/procurement/admin/feature-flags" className="group">
                                            <div className="flex items-center">
                                                <IconStar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Feature Flags</span>
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

                                                    <li className="nav-item">
                                                        <NavLink to="/evaluation/committee/dashboard" className="group">
                                                            <div className="flex items-center">
                                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Evaluation Committee</span>
                                                            </div>
                                                        </NavLink>
                                                    </li>
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

                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Management</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/hod/departments" className="group">
                                            <div className="flex items-center">
                                                <IconUsersGroup className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Departments</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/hod/users" className="group">
                                            <div className="flex items-center">
                                                <IconUser className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">User Management</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/hod/reports" className="group">
                                            <div className="flex items-center">
                                                <IconBarChart className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Reports</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show EVALUATION_COMMITTEE section */}
                            {isEvaluationCommittee && !committeeLocked && (
                                // Evaluation Committee Menu
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>Committee Verification</span>
                                    </h2>
                                    <li className="nav-item">
                                        <NavLink to="/evaluation/committee/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Dashboard</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show INNOVATION_COMMITTEE section */}
                            {isInnovationCommittee && !committeeLocked && (
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
                            {!isInnovationCommittee && !isEvaluationCommittee && isInnovationHub && !innovationLocked && (
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

                            {/* Show REQUESTER section - hide for admins */}
                            {isRequester && !isAdmin && !procurementLocked && (
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

                            {/* Show DEPARTMENT_MANAGER section - hide for admins */}
                            {(isDepartmentManager || isDeptManagerHere) && !isAdmin && !isInnovationHub && !procurementLocked && (
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

                                    <li className="nav-item">
                                        <NavLink to="/innovation/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconThumbUp className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Innovation Hub</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* Show PROCUREMENT_OFFICER section - hide for admins and when in Innovation Hub */}
                            {isProcurementOfficer && !isAdmin && !isInnovationHub && !procurementLocked && (
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

                                    <li className="nav-item">
                                        <NavLink to="/procurement/approvals" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Approvals</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/purchase-orders" className="group">
                                            <div className="flex items-center">
                                                <IconShoppingCart className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Purchase Orders</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/suppliers" className="group">
                                            <div className="flex items-center">
                                                <IconUsersGroup className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Suppliers</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/catalog" className="group">
                                            <div className="flex items-center">
                                                <IconBook className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Catalog</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/reports" className="group">
                                            <div className="flex items-center">
                                                <IconBarChart className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Reports</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/payments" className="group">
                                            <div className="flex items-center">
                                                <IconCreditCard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Payments</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/procurement/admin" className="group">
                                            <div className="flex items-center">
                                                <IconSettings className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Settings</span>
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

                            {/* Show Budget Manager section if applicable - hide for admins and when in Innovation Hub */}
                            {userRoles.some((r: any) => {
                                const roleName = typeof r === 'string' ? r : r?.name || '';
                                return roleName.toUpperCase().includes('BUDGET');
                            }) &&
                                !isAdmin &&
                                !isFinanceManager &&
                                !isInnovationHub &&
                                !procurementLocked && (
                                    // Budget Manager Menu (Old fallback - kept for compatibility)
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

                                        {/* <li className="nav-item">
                                <NavLink to="/procurement/rfq/list" className="group">
                                    <div className="flex items-center">
                                        <IconEdit className="group-hover:!text-primary shrink-0" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">RFQ Management</span>
                                    </div>
                                </NavLink>
                            </li> */}

                                        {/* <li className="nav-item">
                                <NavLink to="/procurement/quotes" className="group">
                                    <div className="flex items-center">
                                        <IconDollarSignCircle className="group-hover:!text-primary shrink-0" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Quotes</span>
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
                                            <NavLink to="/procurement/review" className="group">
                                                <div className="flex items-center">
                                                    <IconChecks className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Review</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        <li className="nav-item">
                                            <NavLink to="/procurement/approvals" className="group">
                                                <div className="flex items-center">
                                                    <IconFile className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Approvals</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        <li className="nav-item">
                                            <NavLink to="/procurement/purchase-orders" className="group">
                                                <div className="flex items-center">
                                                    <IconShoppingCart className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Purchase Orders</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        <li className="nav-item">
                                            <NavLink to="/procurement/suppliers" className="group">
                                                <div className="flex items-center">
                                                    <IconUsersGroup className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Suppliers</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        <li className="nav-item">
                                            <NavLink to="/procurement/catalog" className="group">
                                                <div className="flex items-center">
                                                    <IconBook className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Catalog</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        <li className="nav-item">
                                            <NavLink to="/procurement/reports" className="group">
                                                <div className="flex items-center">
                                                    <IconBarChart className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Reports</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        <li className="nav-item">
                                            <NavLink to="/procurement/payments" className="group">
                                                <div className="flex items-center">
                                                    <IconCreditCard className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Payments</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        <li className="nav-item">
                                            <NavLink to="/procurement/admin" className="group">
                                                <div className="flex items-center">
                                                    <IconSettings className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Settings</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        {/* Procurement Manager */}
                                        <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
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
                                        <li className="nav-item list-none">
                                            <NavLink to="/procurement/manager/requests" className="group">
                                                <div className="flex items-center">
                                                    <IconFile className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">All Requests</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                        <li className="nav-item list-none">
                                            <NavLink to="/procurement/manager/assign" className="group">
                                                <div className="flex items-center">
                                                    <IconUsersGroup className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Assign Requests</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                        <li className="nav-item list-none">
                                            <NavLink to="/procurement/manager/settings" className="group">
                                                <div className="flex items-center">
                                                    <IconSettings className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Load Balancing</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                        {/* <li className="nav-item list-none">
                                <NavLink to="/procurement/manager/rfqs-awaiting" className="group">
                                    <div className="flex items-center">
                                        <IconFile className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">RFQs Awaiting Approval</span>
                                    </div>
                                </NavLink>
                            </li> */}
                                        {/* <li className="nav-item list-none">
                                        <NavLink to="/procurement/manager/evaluations-to-validate" className="group">
                                            <div className="flex items-center">
                                                <IconChecks className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Evaluations to Validate</span>
                                            </div>
                                        </NavLink>
                                    </li> */}

                                        {/* Supplier */}
                                        <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
                                            <IconMinus className="w-4 h-5 flex-none hidden" />
                                            <span>Supplier</span>
                                        </h2>
                                        <li className="nav-item">
                                            <NavLink to="/supplier" className="group">
                                                <div className="flex items-center">
                                                    <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Supplier Dashboard</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        {/* Department Head */}
                                        <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
                                            <IconMinus className="w-4 h-5 flex-none hidden" />
                                            <span>Department Head</span>
                                        </h2>
                                        <li className="nav-item">
                                            <NavLink to="/procurement/department-head-dashboard" className="group">
                                                <div className="flex items-center">
                                                    <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Dashboard</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                        <li className="nav-item list-none">
                                            <NavLink to="/procurement/department-head/evaluations" className="group">
                                                <div className="flex items-center">
                                                    <IconChecks className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Supplier Approvals</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                        <li className="nav-item list-none">
                                            <NavLink to="/procurement/department-head/reports" className="group">
                                                <div className="flex items-center">
                                                    <IconBarChart className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Report Reviews</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        {/* Executive Director */}
                                        <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
                                            <IconMinus className="w-4 h-5 flex-none hidden" />
                                            <span>Executive Director</span>
                                        </h2>
                                        <li className="nav-item">
                                            <NavLink to="/procurement/executive-director-dashboard" className="group">
                                                <div className="flex items-center">
                                                    <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Executive Dashboard</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                        <li className="nav-item list-none">
                                            <NavLink to="/procurement/executive/approvals" className="group">
                                                <div className="flex items-center">
                                                    <IconFile className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Executive Approvals</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                        <li className="nav-item list-none">
                                            <NavLink to="/procurement/executive/signoffs" className="group">
                                                <div className="flex items-center">
                                                    <IconCircleCheck className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Digital Sign-offs</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                        <li className="nav-item list-none">
                                            <NavLink to="/procurement/executive/reports" className="group">
                                                <div className="flex items-center">
                                                    <IconBarChart className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Strategic Reports</span>
                                                </div>
                                            </NavLink>
                                        </li>

                                        {/* Finance */}
                                        <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
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
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
