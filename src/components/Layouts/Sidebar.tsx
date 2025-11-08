import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { toggleSidebar } from '../../store/themeConfigSlice';
import { IRootState } from '../../store';
import { selectUser, selectUserRoles, selectPrimaryUserRole } from '../../store/authSlice';
import { UserRole } from '../../types/auth';

// Icon imports - organized by usage
import IconCaretsDown from '../Icon/IconCaretsDown';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMenuInvoice from '../Icon/Menu/IconMenuInvoice';
import IconMinus from '../Icon/IconMinus';
import IconBarChart from '../Icon/IconBarChart';
import IconBook from '../Icon/IconBook';
import IconChecks from '../Icon/IconChecks';
import IconCircleCheck from '../Icon/IconCircleCheck';
import IconClipboardText from '../Icon/IconClipboardText';
import IconCreditCard from '../Icon/IconCreditCard';
import IconFile from '../Icon/IconFile';
import IconInbox from '../Icon/IconInbox';
import IconSettings from '../Icon/IconSettings';
import IconShoppingCart from '../Icon/IconShoppingCart';
import IconUsersGroup from '../Icon/IconUsersGroup';

const Sidebar = () => {
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const location = useLocation();
    const dispatch = useDispatch();
    
    // Get user and role information
    const user = useSelector(selectUser);
    const userRoles = useSelector(selectUserRoles);
    // Debug current roles to help verify admin gating
    if (userRoles && userRoles.length) {
        console.debug('[Sidebar] roles:', userRoles);
    }
    
    // Role helpers (support both backend codes like 'ADMIN' and enum labels like 'Administrator')
    // Admin detection: supports raw code 'ADMIN', enum label 'Administrator', or any case-insensitive variant containing 'admin'
    const isAdmin = userRoles.some(r => {
        const val = String(r);
        return val === 'ADMIN' || val === UserRole.ADMIN || /admin/i.test(val);
    });
    // Department Head (DEPT_MANAGER | HEAD_OF_DIVISION | label contains Department Head/Head of Division)
    const isDepartmentHead = userRoles.some(r => {
        const val = String(r);
        return val === 'DEPT_MANAGER' || val === 'HEAD_OF_DIVISION' || val === UserRole.DEPARTMENT_HEAD || /department\s*head|head\s*of\s*division/i.test(val);
    });
    // Finance
    const isFinance = userRoles.some(r => {
        const val = String(r);
        return val === 'FINANCE' || val === UserRole.FINANCE || /finance/i.test(val);
    });
    // Executive Director
    const isExecutive = userRoles.some(r => /EXECUTIVE_DIRECTOR/i.test(String(r)) || /executive\s*director/i.test(String(r)));
    // Supplier
    const isSupplier = userRoles.some(r => String(r) === 'SUPPLIER' || /supplier/i.test(String(r)));
    
    // Check if on Innovation Hub routes
    const isInnovationHub = location.pathname.startsWith('/innovation/');

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
                        <NavLink to="/" className="main-logo flex items-center shrink-0">
                            <span className="text-3xl">🌀</span>
                            <span className="text-xl ltr:ml-2 rtl:mr-2 font-bold align-middle lg:inline dark:text-white-light tracking-wider">SPINX</span>
                        </NavLink>

                        <button
                            type="button"
                            className="collapse-icon w-8 h-8 rounded-full flex items-center hover:bg-gray-500/10 dark:hover:bg-dark-light/10 dark:text-white-light transition duration-300 rtl:rotate-180"
                            onClick={() => dispatch(toggleSidebar())}
                            aria-label="Toggle sidebar"
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="h-[calc(100vh-80px)] relative">
                        <ul className="relative font-semibold space-y-0.5 p-4 py-0">
                            {/* ============================================
                                INNOVATION HUB SIDEBAR
                                ============================================ */}
                            {isInnovationHub ? (
                                <>
                                    <li className="nav-section">
                                        <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                            <IconMinus className="w-4 h-5 flex-none hidden" />
                                            <span>💡 Innovation Hub</span>
                                        </h2>
                                    </li>

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
                                                <span className="shrink-0 text-xl">✨</span>
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Create an Idea</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/ideas/browse" className="group">
                                                <div className="flex items-center">
                                                    <span className="shrink-0 text-xl">🔍</span>
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Browse Ideas</span>
                                                </div>
                                        </NavLink>
                                    </li>


                                    <li className="nav-item">
                                        <NavLink to="/innovation/ideas/popular" className="group">
                                                <div className="flex items-center">
                                                    <span className="shrink-0 text-xl">�</span>
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Vote on Idea</span>
                                                </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/innovation/ideas/mine" className="group">
                                                <div className="flex items-center">
                                                    <span className="shrink-0 text-xl">�</span>
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">My Idea</span>
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

                                    {/* Committee Section - Only show if user has committee role */}
                                    {userRoles.includes('INNOVATION_COMMITTEE' as UserRole) && (
                                        <>
                                            <li className="nav-section">
                                                <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
                                                    <IconMinus className="w-4 h-5 flex-none hidden" />
                                                    <span>⚖️ Committee</span>
                                                </h2>
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
                                                        <IconChecks className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Review Ideas</span>
                                                    </div>
                                                </NavLink>
                                            </li>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                            {/* ============================================
                                PROCUREMENT SIDEBAR (Original)
                                ============================================ */}
                            {/* Show Department Head sections only if user is Department Head */}
                            {isDepartmentHead ? (
                                <>
                                    <li className="nav-section">
                                        <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                            <IconMinus className="w-4 h-5 flex-none hidden" />
                                            <span>Department Head</span>
                                        </h2>
                                    </li>
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
                                </>
                            ) : (
                                <>
                                    {/* Show all sections for non-Department Head users */}
                                    <li className="nav-section">
                                        <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                            <IconMinus className="w-4 h-5 flex-none hidden" />
                                            <span>USER</span>
                                        </h2>
                                    </li>

                                    <li className="nav-item">
                                        <NavLink to="/apps/requests" className="group">
                                            <div className="flex items-center">
                                                <IconFile className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Requests</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    <li className="nav-section">
                                        <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-4">
                                            <IconMinus className="w-4 h-5 flex-none hidden" />
                                            <span>Procurement Officer</span>
                                        </h2>
                                    </li>

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

                            {isAdmin && (
                                <li className="nav-item">
                                    <NavLink to="/procurement/admin" className="group">
                                        <div className="flex items-center">
                                            <IconSettings className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Admin Settings</span>
                                        </div>
                                    </NavLink>
                                </li>
                            )}

                            {/* Procurement Manager */}
                            <li className="nav-section">
                                <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
                                    <IconMinus className="w-4 h-5 flex-none hidden" />
                                    <span>Procurement Manager</span>
                                </h2>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/procurement/manager" className="group">
                                    <div className="flex items-center">
                                        <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Manager Dashboard</span>
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
                            <li className="nav-item list-none">
                                <NavLink to="/procurement/manager/evaluations-to-validate" className="group">
                                    <div className="flex items-center">
                                        <IconChecks className="group-hover:!text-primary shrink-0 w-5 h-5" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Evaluations to Validate</span>
                                    </div>
                                </NavLink>
                            </li>

                            {/* Supplier */}
                            <li className="nav-section">
                                <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
                                    <IconMinus className="w-4 h-5 flex-none hidden" />
                                    <span>Supplier</span>
                                </h2>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/supplier" className="group">
                                    <div className="flex items-center">
                                        <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Supplier Dashboard</span>
                                    </div>
                                </NavLink>
                            </li>

                            {/* Department Head */}
                            <li className="nav-section">
                                <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
                                    <IconMinus className="w-4 h-5 flex-none hidden" />
                                    <span>Department Head</span>
                                </h2>
                            </li>
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
                            <li className="nav-section">
                                <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
                                    <IconMinus className="w-4 h-5 flex-none hidden" />
                                    <span>Executive Director</span>
                                </h2>
                            </li>
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
                            <li className="nav-section">
                                <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mt-4 mb-1">
                                    <IconMinus className="w-4 h-5 flex-none hidden" />
                                    <span>Finance</span>
                                </h2>
                            </li>
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
