import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import Dropdown from '../../../components/Dropdown';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { useEffect, useState } from 'react';
import { getToken, getUser } from '../../../utils/auth';
import IconPencilPaper from '../../../components/Icon/IconPencilPaper';
import IconCalendar from '../../../components/Icon/IconCalendar';
import IconMapPin from '../../../components/Icon/IconMapPin';
import IconMail from '../../../components/Icon/IconMail';
import IconPhone from '../../../components/Icon/IconPhone';
import IconShoppingBag from '../../../components/Icon/IconShoppingBag';
import IconTag from '../../../components/Icon/IconTag';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import IconHorizontalDots from '../../../components/Icon/IconHorizontalDots';
import IconFile from '../../../components/Icon/IconFile';
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconChecks from '../../../components/Icon/IconChecks';
import IconPlus from '../../../components/Icon/IconPlus';
import IconUsers from '../../../components/Icon/IconUsers';
import IconSettings from '../../../components/Icon/IconSettings';
import IconLayoutGrid from '../../../components/Icon/IconLayoutGrid';

const Profile = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: IRootState) => state.auth);
    const [profileData, setProfileData] = useState<any>(null);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Profile'));
    }, [dispatch]);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const token = getToken();
                const currentUser = getUser();

                if (!token || !currentUser) {
                    setIsLoading(false);
                    return;
                }

                // Fetch user profile details
                const response = await fetch(`http://heron:4000/api/users/${currentUser.id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-user-id': currentUser.id.toString(),
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setProfileData(data);
                }

                // Fetch recent activities/requests
                const activitiesResponse = await fetch(`http://heron:4000/api/requests?limit=7`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-user-id': currentUser.id.toString(),
                        'Content-Type': 'application/json',
                    },
                });

                if (activitiesResponse.ok) {
                    const activitiesData = await activitiesResponse.json();
                    setRecentActivities(activitiesData.slice(0, 7));
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileData();
    }, []);

    const formatDate = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} mins ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { class: string; label: string }> = {
            APPROVED: { class: 'bg-success', label: 'Approved' },
            SUBMITTED: { class: 'bg-info', label: 'In Review' },
            PENDING_DELIVERY: { class: 'bg-warning', label: 'Pending Delivery' },
            IN_EVALUATION: { class: 'bg-primary', label: 'Under Evaluation' },
            AWAITING_QUOTES: { class: 'bg-secondary', label: 'Awaiting Quotes' },
            COMPLETED: { class: 'bg-success', label: 'Completed' },
            IN_TRANSIT: { class: 'bg-info', label: 'In Transit' },
            DRAFT: { class: 'bg-secondary', label: 'Draft' },
        };
        return statusMap[status] || { class: 'bg-secondary', label: status };
    };

    const getUserRoles = () => {
        if (!user?.roles || user.roles.length === 0) return 'User';
        const roleLabels: Record<string, string> = {
            PROCUREMENT_MANAGER: 'Procurement Manager',
            PROCUREMENT_OFFICER: 'Procurement Officer',
            DEPT_MANAGER: 'Department Manager',
            BUDGET_MANAGER: 'Budget Manager',
            EVALUATION_COMMITTEE: 'Evaluation Committee',
        };
        return user.roles.map((role: string) => roleLabels[role] || role).join(', ');
    };

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const displayUser = profileData || user;
    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="/" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>My Profile</span>
                </li>
            </ul>
            <div className="pt-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-5">
                    <div className="panel">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Profile</h5>
                            <Link to="/users/user-account-settings" className="ltr:ml-auto rtl:mr-auto btn btn-primary p-2 rounded-full">
                                <IconPencilPaper />
                            </Link>
                        </div>
                        <div className="mb-5">
                            <div className="flex flex-col justify-center items-center">
                                <img src="/assets/images/user-profile.jpeg" alt="img" className="w-24 h-24 rounded-full object-cover  mb-5" />
                                <p className="font-semibold text-primary text-xl">{displayUser?.full_name || 'User'}</p>
                            </div>
                            <ul className="mt-5 flex flex-col max-w-[160px] m-auto space-y-4 font-semibold text-white-dark">
                                <li className="flex items-center gap-2">
                                    <IconShoppingBag className="shrink-0" />
                                    {getUserRoles()}
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconCalendar className="shrink-0" />
                                    Joined: {displayUser?.createdAt ? new Date(displayUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2024'}
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconMapPin className="shrink-0" />
                                    {displayUser?.location || 'Kingston, Jamaica'}
                                </li>
                                <li>
                                    <button className="flex items-center gap-2">
                                        <IconMail className="w-5 h-5 shrink-0" />
                                        <span className="text-primary truncate">{displayUser?.email || 'N/A'}</span>
                                    </button>
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconPhone />
                                    <span className="whitespace-nowrap" dir="ltr">
                                        {displayUser?.phone || '+1 (876) 555-1234'}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="panel lg:col-span-2 xl:col-span-3">
                        <div className="mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Recent Procurement Activities</h5>
                        </div>
                        <div className="mb-5">
                            <div className="table-responsive text-[#515365] dark:text-white-light font-semibold">
                                <table className="whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            <th>Activity</th>
                                            <th>Status</th>
                                            <th>Progress</th>
                                            <th className="text-center">Last Updated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="dark:text-white-dark">
                                        {recentActivities.length > 0 ? (
                                            recentActivities.map((activity, index) => {
                                                const status = getStatusBadge(activity.status);
                                                const progress =
                                                    activity.status === 'COMPLETED' || activity.status === 'APPROVED'
                                                        ? 100
                                                        : activity.status === 'IN_TRANSIT'
                                                        ? 80
                                                        : activity.status === 'IN_EVALUATION' || activity.status === 'SUBMITTED'
                                                        ? 75
                                                        : activity.status === 'PENDING_DELIVERY'
                                                        ? 60
                                                        : activity.status === 'AWAITING_QUOTES'
                                                        ? 30
                                                        : 50;

                                                return (
                                                    <tr key={activity.id || index}>
                                                        <td>
                                                            {activity.reference} - {activity.title}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${status.class}`}>{status.label}</span>
                                                        </td>
                                                        <td>
                                                            <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-full">
                                                                <div className={`${status.class.replace('bg-', 'bg-')} rounded-full`} style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center">{formatDate(activity.updatedAt || activity.createdAt)}</td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="text-center py-4">
                                                    No recent activities
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Performance Summary</h5>
                        </div>
                        <div className="space-y-4">
                            <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <div className="flex items-center justify-between p-4 py-2">
                                    <div className="grid place-content-center w-9 h-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light">
                                        <IconClipboardText />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                        <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                                            Evaluations Completed
                                            <span className="block text-base text-[#515365] dark:text-white-light">28 this month</span>
                                        </h6>
                                        <p className="ltr:ml-auto rtl:mr-auto text-info">95%</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <div className="flex items-center justify-between p-4 py-2">
                                    <div className="grid place-content-center w-9 h-9 rounded-md bg-success-light dark:bg-success text-success dark:text-success-light">
                                        <IconChecks />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                        <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                                            Approvals Processed
                                            <span className="block text-base text-[#515365] dark:text-white-light">45 this month</span>
                                        </h6>
                                        <p className="ltr:ml-auto rtl:mr-auto text-success">100%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between mb-10">
                            <h5 className="font-semibold text-lg dark:text-white-light">Department Access</h5>
                            <Link to="/settings" className="btn btn-primary">
                                Manage Settings
                            </Link>
                        </div>
                        <div className="group">
                            <ul className="list-inside list-disc text-white-dark font-semibold mb-7 space-y-2">
                                {user?.roles?.includes('PROCUREMENT_MANAGER') && (
                                    <>
                                        <li>Full Procurement Access</li>
                                        <li>Request Creation & Management</li>
                                        <li>Quote Evaluation Rights</li>
                                        <li>Purchase Order Generation</li>
                                        <li>Supplier Management</li>
                                        <li>Reporting & Analytics</li>
                                    </>
                                )}
                                {user?.roles?.includes('PROCUREMENT_OFFICER') && (
                                    <>
                                        <li>Request Processing</li>
                                        <li>Quote Processing</li>
                                        <li>Vendor Communication</li>
                                        <li>Request Fulfillment</li>
                                    </>
                                )}
                                {user?.roles?.includes('DEPT_MANAGER') && (
                                    <>
                                        <li>Department Request Approval</li>
                                        <li>Budget Review</li>
                                        <li>Team Request Management</li>
                                    </>
                                )}
                                {user?.roles?.includes('EVALUATION_COMMITTEE') && (
                                    <>
                                        <li>Quote Evaluation</li>
                                        <li>Vendor Assessment</li>
                                        <li>Recommendation Rights</li>
                                    </>
                                )}
                                {(!user?.roles || user.roles.length === 0) && <li>Standard User Access</li>}
                            </ul>
                            <div className="flex items-center justify-between mb-4 font-semibold">
                                <p className="flex items-center rounded-full bg-success px-2 py-1 text-xs text-white-light font-semibold">
                                    <IconChecks className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                                    Active Account
                                </p>
                                <p className="text-primary">{getUserRoles()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="panel">
                        {/* Recent Transactions panel removed as per request */}
                        <div className="p-4 text-sm text-white-dark italic">Recent Transactions removed. (Can add real-time financial metrics here later.)</div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Quick Actions</h5>
                        </div>
                        <div className="space-y-3">
                            <Link to="/apps/requests/new" className="btn btn-primary w-full">
                                <IconPlus className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Create New Request
                            </Link>
                            <Link to="/apps/procurement-manager/all-requests" className="btn btn-info w-full">
                                <IconFile className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                All Requests
                            </Link>
                            <Link to="/apps/procurement-manager/assign-requests" className="btn btn-success w-full">
                                <IconUsers className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Assign Requests
                            </Link>
                            <Link to="/apps/procurement-manager/load-balancing" className="btn btn-warning w-full">
                                <IconSettings className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Load Balancing
                            </Link>
                            <Link to="/apps/procurement-manager/evaluations" className="btn btn-secondary w-full">
                                <IconClipboardText className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Evaluations to Validate
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
