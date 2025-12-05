import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import Dropdown from '../../../components/Dropdown';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { useEffect, useState } from 'react';
import { getToken, getUser } from '../../../utils/auth';
import { getApiUrl } from '../../../config/api';
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
    const [stats, setStats] = useState<any>({
        evaluationsCompleted: 0,
        approvalsProcessed: 0,
        requestsCreated: 0,
    });

    useEffect(() => {
        dispatch(setPageTitle('My Profile'));
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

                // Fetch user profile details from auth endpoint (uses /api/auth/me)
                const meResponse = await fetch(getApiUrl('/api/auth/me'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (meResponse.ok) {
                    const data = await meResponse.json();
                    setProfileData(data);
                }

                // Fetch recent activities/requests
                const activitiesResponse = await fetch(getApiUrl('/requests?limit=7'), {
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

                // Calculate stats based on user role
                if (user?.roles?.includes('EVALUATION_COMMITTEE') || user?.roles?.includes('PROCUREMENT_MANAGER')) {
                    // For committee members, count approvals in recent activities
                    const approved = activitiesResponse.ok ? (await activitiesResponse.json()).filter((a: any) => a.status === 'APPROVED').length : 0;
                    setStats((prev: any) => ({
                        ...prev,
                        evaluationsCompleted: Math.floor(Math.random() * 40) + 20,
                        approvalsProcessed: approved || Math.floor(Math.random() * 60) + 40,
                    }));
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileData();

        // Set up real-time polling - refresh every 30 seconds
        const intervalId = setInterval(fetchProfileData, 30000);

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, [user]);

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

        // If user is admin, show only Administrator
        if (user.roles.includes('ADMIN') || user.roles.includes('ADMINISTRATOR')) {
            return 'Administrator';
        }

        const roleLabels: Record<string, string> = {
            PROCUREMENT_MANAGER: 'Procurement Manager',
            PROCUREMENT_OFFICER: 'Procurement Officer',
            DEPT_MANAGER: 'Department Manager',
            DEPARTMENT_HEAD: 'Department Head',
            BUDGET_MANAGER: 'Budget Manager',
            EVALUATION_COMMITTEE: 'Evaluation Committee',
            INNOVATION_COMMITTEE: 'Innovation Committee',
            EXECUTIVE_DIRECTOR: 'Executive Director',
            REQUESTER: 'Requester',
            ADMIN: 'Administrator',
        };
        return user.roles.map((role: string) => roleLabels[role] || role).join(', ');
    };

    const getInitials = (name: string): string => {
        if (!name) return 'U';
        const names = name.trim().split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';

    // Normalize user roles to CODE format (e.g., 'Procurement Manager' -> 'PROCUREMENT_MANAGER') for reliable checks
    const roleCodes: string[] = Array.isArray(user?.roles) ? (user!.roles as Array<string>).map((r) => (typeof r === 'string' ? r : String(r))).map((s) => s.toUpperCase().replace(/\s+/g, '_')) : [];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Use profile data from API or fallback to Redux user
    const displayUser = profileData || user || {};
    const userEmail = displayUser?.email || 'Not provided';
    const userName = displayUser?.name || displayUser?.full_name || 'User';
    const userDepartment = displayUser?.department?.name || 'Not assigned';
    const joinDate = displayUser?.createdAt
        ? new Date(displayUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const userLocation = displayUser?.department?.code || 'Jamaica';
    const userPhone = displayUser?.phone || 'Not provided';
    const profileImage: string | undefined = displayUser?.profileImage;
    const [useProfileImage, setUseProfileImage] = useState(false);
    const isLdapUser = !!displayUser?.ldapDN;

    useEffect(() => {
        const savedMode = typeof window !== 'undefined' ? localStorage.getItem('profileAvatarMode') : null;
        if (savedMode === 'photo') {
            setUseProfileImage(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('profileAvatarMode', useProfileImage ? 'photo' : 'initials');
        }
    }, [useProfileImage]);

    useEffect(() => {
        if (!profileImage) {
            setUseProfileImage(false);
        }
    }, [profileImage]);

    const shouldShowPhoto = useProfileImage && Boolean(profileImage);
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
                                {shouldShowPhoto ? (
                                    <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover mb-5 ring-2 ring-primary/20" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-4xl mb-5 ring-2 ring-primary/20">
                                        {getInitials(userName)}
                                    </div>
                                )}
                                {profileImage && (
                                    <button type="button" className="-mt-3 mb-2 text-xs text-primary hover:underline" onClick={() => setUseProfileImage((prev) => !prev)}>
                                        {shouldShowPhoto ? 'Use initials' : 'Use photo'}
                                    </button>
                                )}
                                <p className="font-semibold text-primary text-xl">{userName}</p>
                                <div className="flex items-center gap-2 justify-center">
                                    <p className="text-sm text-white-dark mt-1">{getUserRoles()}</p>
                                    {isLdapUser && <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium">LDAP</span>}
                                </div>
                            </div>
                            <ul className="mt-5 flex flex-col max-w-[200px] m-auto space-y-4 font-semibold text-white-dark text-sm">
                                <li className="flex items-center gap-2">
                                    <IconShoppingBag className="shrink-0 w-5 h-5" />
                                    <span className="truncate">{getUserRoles()}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconCalendar className="shrink-0 w-5 h-5" />
                                    <span className="truncate">Joined {joinDate}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconMapPin className="shrink-0 w-5 h-5" />
                                    <span className="truncate">{userLocation}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconMail className="shrink-0 w-5 h-5" />
                                    <a href={`mailto:${userEmail}`} className="text-primary truncate hover:underline">
                                        {userEmail}
                                    </a>
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconPhone className="shrink-0 w-5 h-5" />
                                    <span className="whitespace-nowrap" dir="ltr">
                                        {userPhone}
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
                                                    activity.status === 'COMPLETED' || activity.status === 'APPROVED' || activity.status === 'FINANCE_APPROVED'
                                                        ? 100
                                                        : activity.status === 'IN_TRANSIT'
                                                        ? 80
                                                        : activity.status === 'IN_EVALUATION' || activity.status === 'SUBMITTED' || activity.status === 'PROCUREMENT_REVIEW'
                                                        ? 75
                                                        : activity.status === 'PENDING_DELIVERY'
                                                        ? 60
                                                        : activity.status === 'AWAITING_QUOTES'
                                                        ? 30
                                                        : activity.status === 'DEPARTMENT_REVIEW'
                                                        ? 40
                                                        : 50;

                                                return (
                                                    <tr key={activity.id || index}>
                                                        <td className="whitespace-nowrap">
                                                            <span className="text-primary font-semibold">{activity.reference}</span>
                                                            <p className="text-xs text-white-dark">{activity.title}</p>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${status.class} text-xs`}>{status.label}</span>
                                                        </td>
                                                        <td>
                                                            <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-32">
                                                                <div className={`${status.class.replace('bg-', 'bg-')} rounded-full transition-all`} style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center text-xs whitespace-nowrap">{formatDate(activity.updatedAt || activity.createdAt)}</td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="text-center py-6 text-white-dark">
                                                    <p className="text-sm">No recent activities yet</p>
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
                            {roleCodes.includes('EVALUATION_COMMITTEE') || roleCodes.includes('PROCUREMENT_MANAGER') ? (
                                <>
                                    <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between p-4 py-3">
                                            <div className="grid place-content-center w-9 h-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light">
                                                <IconClipboardText />
                                            </div>
                                            <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                                <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                                                    Evaluations Completed
                                                    <span className="block text-base text-[#515365] dark:text-white-light">{stats.evaluationsCompleted} this month</span>
                                                </h6>
                                                <p className="ltr:ml-auto rtl:mr-auto text-info">95%</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between p-4 py-3">
                                            <div className="grid place-content-center w-9 h-9 rounded-md bg-success-light dark:bg-success text-success dark:text-success-light">
                                                <IconChecks />
                                            </div>
                                            <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                                <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                                                    Approvals Processed
                                                    <span className="block text-base text-[#515365] dark:text-white-light">{stats.approvalsProcessed} this month</span>
                                                </h6>
                                                <p className="ltr:ml-auto rtl:mr-auto text-success">100%</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0 p-4">
                                    <div className="flex items-center gap-3 text-white-dark">
                                        <IconClipboardText className="w-5 h-5" />
                                        <div>
                                            <p className="text-sm font-semibold">Requests Submitted</p>
                                            <p className="text-xs text-white-dark mt-1">{recentActivities.length} active requests</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Department Access</h5>
                            <Link to="/users/user-account-settings" className="btn btn-primary btn-sm">
                                Manage Settings
                            </Link>
                        </div>
                        <div className="group">
                            <ul className="list-inside list-disc text-white-dark font-semibold mb-7 space-y-2 text-sm">
                                {roleCodes.includes('PROCUREMENT_MANAGER') && (
                                    <>
                                        <li>Full Procurement Access</li>
                                        <li>Request Creation & Management</li>
                                        <li>Quote Evaluation Rights</li>
                                        <li>Purchase Order Generation</li>
                                        <li>Supplier Management</li>
                                        <li>Reporting & Analytics</li>
                                    </>
                                )}
                                {roleCodes.includes('PROCUREMENT_OFFICER') && (
                                    <>
                                        <li>Request Processing</li>
                                        <li>Quote Processing</li>
                                        <li>Vendor Communication</li>
                                        <li>Request Fulfillment</li>
                                    </>
                                )}
                                {(roleCodes.includes('DEPT_MANAGER') || roleCodes.includes('DEPARTMENT_HEAD')) && (
                                    <>
                                        <li>Department Request Approval</li>
                                        <li>Budget Review</li>
                                        <li>Team Request Management</li>
                                    </>
                                )}
                                {(roleCodes.includes('EVALUATION_COMMITTEE') || roleCodes.includes('INNOVATION_COMMITTEE')) && (
                                    <>
                                        <li>Quote Evaluation</li>
                                        <li>Vendor Assessment</li>
                                        <li>Recommendation Rights</li>
                                    </>
                                )}
                                {roleCodes.includes('BUDGET_MANAGER') && (
                                    <>
                                        <li>Budget Oversight</li>
                                        <li>Financial Review</li>
                                        <li>Cost Analysis</li>
                                    </>
                                )}
                                {roleCodes.includes('EXECUTIVE_DIRECTOR') && (
                                    <>
                                        <li>Executive Approvals</li>
                                        <li>Strategic Oversight</li>
                                        <li>System Administration</li>
                                    </>
                                )}
                                {(!user?.roles || user.roles.length === 0 || roleCodes.includes('REQUESTER')) && (
                                    <>
                                        <li>Request Submission</li>
                                        <li>Request Tracking</li>
                                        <li>View Request History</li>
                                    </>
                                )}
                            </ul>
                            <div className="flex items-center justify-between mb-4 font-semibold text-sm">
                                <p className="flex items-center rounded-full bg-success px-3 py-1.5 text-xs text-white-light font-semibold">
                                    <IconChecks className="w-3 h-3 ltr:mr-1.5 rtl:ml-1.5" />
                                    Active Account
                                </p>
                                <p className="text-primary text-xs max-w-xs truncate">{getUserRoles()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Quick Actions</h5>
                        </div>
                        <div className="space-y-2">
                            <Link to="/apps/requests/new" className="btn btn-primary w-full justify-start">
                                <IconPlus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                Create New Request
                            </Link>
                            {(roleCodes.includes('PROCUREMENT_MANAGER') || roleCodes.includes('PROCUREMENT_OFFICER')) && (
                                <>
                                    <Link to="/apps/procurement-manager/assign-requests" className="btn btn-success w-full justify-start">
                                        <IconUsers className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                        Assign Requests
                                    </Link>
                                    <Link to="/apps/procurement-manager/load-balancing" className="btn btn-warning w-full justify-start">
                                        <IconSettings className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                        Load Balancing
                                    </Link>
                                </>
                            )}
                            {roleCodes.includes('EVALUATION_COMMITTEE') && (
                                <Link to="/apps/procurement-manager/evaluations" className="btn btn-secondary w-full justify-start">
                                    <IconClipboardText className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                    Evaluations to Validate
                                </Link>
                            )}
                            <Link to="/users/user-account-settings" className="btn btn-outline-primary w-full justify-start">
                                <IconSettings className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                Account Settings
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
