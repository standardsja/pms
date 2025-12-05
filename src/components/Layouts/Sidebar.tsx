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

const Sidebar = () => {
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    // Get current user to check role
    const currentUser = getUser();
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);

    const isAdmin = userRoles.includes('ADMIN');
    // Head of Division (HOD) should see admin sidebar items
    const isHeadOfDivision = userRoles.includes('HEAD_OF_DIVISION') || userRoles.includes('HOD') || userRoles.includes('HEAD_OF_DEPARTMENT');
    const isCommitteeMember = userRoles.includes('INNOVATION_COMMITTEE');
    const isEvaluationCommittee = userRoles.includes('EVALUATION_COMMITTEE');

    // Finance Manager or Budget Manager - limited access
    const isFinanceManager = userRoles.some((r: string) => {
        const upper = r?.toUpperCase() || '';
        return upper === 'FINANCE_MANAGER' || upper === 'BUDGET_MANAGER' || upper.includes('FINANCE') || upper.includes('BUDGET');
    });

    // Specific procurement manager role (must have PROCUREMENT in the name)
    const isProcurementManager = userRoles.some((r: string) => {
        const upper = r?.toUpperCase() || '';
        return upper === 'PROCUREMENT_MANAGER' || (upper.includes('PROCUREMENT') && upper.includes('MANAGER'));
    });

    // Department managers (not procurement-specific)
    const isDepartmentManager =
        !isProcurementManager &&
        userRoles.some((r: string) => {
            const upper = r?.toUpperCase() || '';
            return upper === 'DEPT_MANAGER' || upper === 'DEPARTMENT_MANAGER' || upper === 'MANAGER';
        });

    // Only check for Officer if not a Manager
    const isProcurementOfficer = !isProcurementManager && (userRoles.includes('PROCUREMENT_OFFICER') || userRoles.includes('PROCUREMENT'));
    // Supplier role
    const isSupplier = userRoles.includes('SUPPLIER') || userRoles.some((r) => r && r.toUpperCase().includes('SUPPLIER'));
    // Requester role (minimal access: Requests only)
    const isRequester = !isProcurementManager && !isDepartmentManager && !isProcurementOfficer && !isCommitteeMember && !isSupplier && userRoles.some((r) => r.toUpperCase().includes('REQUEST')); // matches REQUESTER / REQUEST_USER etc.

    // Determine if we're in Innovation Hub
    const isInnovationHub = location.pathname.startsWith('/innovation');
    // Compute dashboard path for logo/home
    // ADMIN takes priority over all other roles
    const dashboardPath =
        isAdmin || isHeadOfDivision
            ? '/procurement/admin'
            : isEvaluationCommittee
            ? '/evaluation/committee/dashboard'
            : isCommitteeMember
            ? '/innovation/committee/dashboard'
            : isInnovationHub
            ? '/innovation/dashboard'
            : isFinanceManager
            ? '/finance'
            : isProcurementManager
            ? '/procurement/manager'
            : isDepartmentManager
            ? '/apps/requests/pending-approval'
            : isSupplier
            ? '/supplier'
            : isRequester
            ? '/apps/requests'
            : '/procurement/dashboard';

    // Debug logging for dashboard path
    console.log('[SIDEBAR] User roles:', userRoles);
    console.log('[SIDEBAR] isProcurementManager:', isProcurementManager);
    console.log('[SIDEBAR] Calculated dashboardPath:', dashboardPath);

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

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
                            {/* Show ADMIN section for admin users (also visible to Head of Division/HOD) */}
                            {(isAdmin || isHeadOfDivision) && (
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

                            {/* Show EVALUATION_COMMITTEE section */}
                            {isEvaluationCommittee && (
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
                            {isCommitteeMember && (
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
                            {!isCommitteeMember && !isEvaluationCommittee && isInnovationHub && (
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
                            {isRequester && !isAdmin && (
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
                            {isDepartmentManager && !isAdmin && !isInnovationHub && (
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
                            {isProcurementOfficer && !isAdmin && !isInnovationHub && (
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
                            {isProcurementManager && !isAdmin && !isInnovationHub && (
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
                            {isFinanceManager && !isAdmin && !isProcurementManager && !isInnovationHub && (
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
                            {userRoles.some((r: string) => r?.toUpperCase()?.includes('BUDGET')) && !isAdmin && !isFinanceManager && !isInnovationHub && (
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
