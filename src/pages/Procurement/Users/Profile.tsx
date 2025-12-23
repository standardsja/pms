import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import Dropdown from '../../../components/Dropdown';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { useEffect, useState } from 'react';
import { getToken, getUser } from '../../../utils/auth';
import { getApiUrl } from '../../../config/api';
import { computeRoleContext, ProfilePageVisibility, getPerformanceMetrics, getRoleSpecificAccess } from '../../../utils/roleVisibilityHelper';
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
import IconBulb from '../../../components/Icon/IconOpenBook';
import IconThumbUp from '../../../components/Icon/IconThumbUp';
import IconStar from '../../../components/Icon/IconStar';
import IconSearch from '../../../components/Icon/IconSearch';

const Profile = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: IRootState) => state.auth);
    const [profileData, setProfileData] = useState<any>(null);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [roleContext, setRoleContext] = useState<any>(null);
    const [stats, setStats] = useState<any>({
        // Procurement stats
        evaluationsCompleted: 0,
        approvalsProcessed: 0,
        requestsCreated: 0,
        // Innovation Hub stats
        ideasSubmitted: 0,
        ideasApproved: 0,
        votesReceived: 0,
        ideasUnderReview: 0,
        ideasPromoted: 0,
        isCommittee: false,
    });

    const resolveProfileImageUrl = (raw?: string | null) => {
        if (!raw) return null;
        const absolute = raw.startsWith('http') ? raw : getApiUrl(raw);
        const separator = absolute.includes('?') ? '&' : '?';
        return `${absolute}${separator}t=${Date.now()}`;
    };

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

                // Fetch user profile details from auth endpoint
                const meResponse = await fetch(getApiUrl('/api/auth/me'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store', // Force fresh fetch, no cache
                });
                if (meResponse.ok) {
                    const data = await meResponse.json();

                    // Fallback: if profileImage is missing from /api/auth/me, fetch from /api/auth/profile-photo
                    if (!data.profileImage) {
                        try {
                            const photoResponse = await fetch(getApiUrl('/api/auth/profile-photo'), {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                                cache: 'no-store',
                            });
                            if (photoResponse.ok) {
                                const photoData = await photoResponse.json();
                                if (photoData.success && photoData.data?.profileImage) {
                                    data.profileImage = photoData.data.profileImage;
                                }
                            }
                        } catch (error) {
                            console.warn('Could not fetch photo from profile endpoint:', error);
                        }
                    }

                    // Store raw profile image path (cache-busting timestamp added at render time)
                    // This ensures fresh image loads when component re-renders
                    setProfileData(data);
                    // Fetch Innovation Hub stats
                    try {
                        const statsResponse = await fetch(getApiUrl('/api/auth/me/innovation-stats'), {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                            cache: 'no-store',
                        });

                        if (statsResponse.ok) {
                            const statsData = await statsResponse.json();
                            setStats((prev: any) => ({
                                ...prev,
                                ...statsData,
                            }));
                        } else {
                            // Continue without stats - not a critical error
                        }
                    } catch (statsError) {
                        // Continue without stats - not a critical error
                    }

                    // Compute role context for visibility rules
                    const context = computeRoleContext(data.roles);
                    setRoleContext(context);
                } else {
                }

                // Skip fetching activities for now - just set empty array
                setRecentActivities([]);
            } catch (error) {
                // Show user-friendly error notification
                const Swal = (await import('sweetalert2')).default;
                Swal.fire({
                    title: 'Notice',
                    text: 'Some profile data could not be loaded. Your profile photo upload will still work.',
                    icon: 'info',
                    confirmButtonText: 'OK',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileData();
    }, []); // Empty dependency - only run on mount

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        // Validate file type
        if (!file.type.startsWith('image/')) {
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({
                title: 'Invalid File',
                text: 'Please select an image file',
                icon: 'error',
                confirmButtonText: 'OK',
            });
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({
                title: 'File Too Large',
                text: 'Image size must be less than 5MB',
                icon: 'error',
                confirmButtonText: 'OK',
            });
            return;
        }

        setUploadingPhoto(true);

        try {
            const token = getToken();
            const currentUser = getUser();
            if (!token || !currentUser) {
                throw new Error('Not authenticated');
            }

            const formData = new FormData();
            formData.append('photo', file);

            const response = await fetch(getApiUrl('/api/auth/upload-photo'), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'x-user-id': currentUser.id.toString(),
                },
                body: formData,
            });
            if (!response.ok) {
                const errorText = await response.text();
                let error;
                try {
                    error = JSON.parse(errorText);
                } catch {
                    error = { message: errorText };
                }
                throw new Error(error.message || 'Failed to upload photo');
            }

            const data = await response.json();
            // Store the raw profile image path (without cache-busting timestamp)
            // Cache-busting will be added at render time to ensure fresh loads
            setProfileData((prev: any) => ({
                ...prev,
                profileImage: data.profileImage,
            }));

            // Dispatch event with cache-busted URL for Header component
            window.dispatchEvent(
                new CustomEvent('profilePhotoUpdated', {
                    detail: { profileImage: resolveProfileImageUrl(data.profileImage) },
                })
            );

            // Show success notification using Swal instead of alert
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({
                title: 'Success!',
                text: 'Profile photo updated successfully',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end',
            });
        } catch (error: any) {
            // Show error notification using Swal
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({
                title: 'Upload Failed',
                text: error.message || 'Failed to upload photo',
                icon: 'error',
                confirmButtonText: 'OK',
            });
        } finally {
            setUploadingPhoto(false);
        }
    };

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

        // Check for admin role (handles both 'ADMIN' and 'ADMINISTRATOR')
        const isAdmin = user.roles.some((role: any) => {
            const roleStr = typeof role === 'string' ? role : String(role);
            return roleStr.toUpperCase() === 'ADMIN' || roleStr.toUpperCase() === 'ADMINISTRATOR';
        });

        if (isAdmin) {
            return 'Administrator';
        }

        const roleLabels: Record<string, string> = {
            PROCUREMENT_MANAGER: 'Procurement Manager',
            PROCUREMENT_OFFICER: 'Procurement Officer',
            DEPT_MANAGER: 'Department Manager',
            DEPARTMENT_HEAD: 'Department Head',
            BUDGET_MANAGER: 'Budget Manager',
            INNOVATION_COMMITTEE: 'Innovation Committee',
            EXECUTIVE_DIRECTOR: 'Executive Director',
            REQUESTER: 'Requester',
            ADMIN: 'Administrator',
            ADMINISTRATOR: 'Administrator',
        };

        return (user.roles as Array<any>)
            .map((role: any) => {
                const roleStr = typeof role === 'string' ? role : String(role);
                return roleLabels[roleStr.toUpperCase()] || roleStr;
            })
            .join(', ');
    };

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';

    // Normalize user roles to CODE format (e.g., 'Procurement Manager' -> 'PROCUREMENT_MANAGER') for reliable checks
    const roleCodes: string[] = Array.isArray(user?.roles)
        ? (user!.roles as Array<any>).map((r: any) => (typeof r === 'string' ? r : String(r))).map((s: string) => s.toUpperCase().replace(/\s+/g, '_'))
        : [];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Use profile data from API (always prefer fresh data over Redux)
    const displayUser = profileData || {};
    const userEmail = displayUser?.email || user?.email || 'Not provided';
    const userName = displayUser?.name || (user as any)?.name || displayUser?.full_name || (user as any)?.full_name || 'User';
    const userDepartment = displayUser?.department?.name || 'Not assigned';
    const joinDate = displayUser?.createdAt ? new Date(displayUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2024';
    const userLocation = displayUser?.department?.code || 'Jamaica';
    const userPhone = displayUser?.phone || '';
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
                                <div className="relative group mb-4 transition-transform duration-300 hover:scale-105">
                                    {displayUser?.profileImage && !imageError ? (
                                        <img
                                            src={resolveProfileImageUrl(displayUser.profileImage) ?? undefined}
                                            alt="profile"
                                            className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/30 shadow-lg transition-shadow duration-300 group-hover:ring-primary/50"
                                            onError={() => setImageError(true)}
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 dark:from-primary/40 dark:to-primary/20 ring-4 ring-primary/30 flex items-center justify-center shadow-lg font-bold">
                                            <span className="text-4xl text-primary dark:text-primary-light">{userName?.charAt(0)?.toUpperCase() || '?'}</span>
                                        </div>
                                    )}
                                    <label
                                        htmlFor="photo-upload"
                                        className="absolute bottom-0 right-0 bg-primary text-white p-2.5 rounded-full cursor-pointer hover:bg-primary-dark transition-all duration-200 shadow-md opacity-0 group-hover:opacity-100 transform hover:scale-110"
                                        title="Upload profile photo (max 5MB)"
                                    >
                                        {uploadingPhoto ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <IconPencilPaper className="w-5 h-5" />
                                        )}
                                    </label>
                                    <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} aria-label="Upload profile photo" />
                                </div>
                                <p className="font-semibold text-primary text-xl text-center break-words max-w-[180px]">{userName}</p>
                                <p className="text-sm text-white-dark mt-1 text-center">{getUserRoles()}</p>
                                {displayUser?.email && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">(ID: {displayUser.id})</p>}
                            </div>
                            <ul className="mt-6 flex flex-col max-w-[220px] m-auto space-y-3 font-semibold text-white-dark text-sm">
                                <li className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                    <IconShoppingBag className="shrink-0 w-5 h-5 text-primary" />
                                    <span className="truncate">{getUserRoles()}</span>
                                </li>
                                {userDepartment && userDepartment !== 'Not assigned' && (
                                    <li className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                        <IconTag className="shrink-0 w-5 h-5 text-success" />
                                        <span className="truncate" title={userDepartment}>
                                            {userDepartment}
                                        </span>
                                    </li>
                                )}
                                <li className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                    <IconCalendar className="shrink-0 w-5 h-5 text-warning" />
                                    <span className="truncate">Joined {joinDate}</span>
                                </li>
                                <li className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                    <IconMapPin className="shrink-0 w-5 h-5 text-danger" />
                                    <span className="truncate">{userLocation}</span>
                                </li>
                                <li className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                    <IconMail className="shrink-0 w-5 h-5 text-info" />
                                    <a href={`mailto:${userEmail}`} className="text-primary truncate hover:underline font-medium">
                                        {userEmail}
                                    </a>
                                </li>
                                {userPhone && (
                                    <li className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                        <IconPhone className="shrink-0 w-5 h-5 text-secondary" />
                                        <span className="whitespace-nowrap" dir="ltr">
                                            {userPhone}
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                    <div className="panel lg:col-span-2 xl:col-span-3">
                        <div className="mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">
                                {roleCodes.includes('INNOVATION_COMMITTEE')
                                    ? 'Recent Ideas Under Review'
                                    : roleCodes.some((role) => role.includes('PROCUREMENT') || role.includes('BUDGET') || role.includes('EVALUATION'))
                                    ? 'Recent Procurement Activities'
                                    : 'Recent Activities'}
                            </h5>
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
                                                    <tr key={activity.id || index} className="hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="whitespace-nowrap">
                                                            <span className="text-primary font-semibold">{activity.reference}</span>
                                                            <p className="text-xs text-white-dark mt-0.5">{activity.title}</p>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${status.class} text-xs font-medium`}>{status.label}</span>
                                                        </td>
                                                        <td>
                                                            <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-32 overflow-hidden">
                                                                <div
                                                                    className={`${status.class.replace('bg-', 'bg-')} rounded-full transition-all duration-300`}
                                                                    style={{ width: `${progress}%` }}
                                                                ></div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center text-xs whitespace-nowrap text-white-dark">{formatDate(activity.updatedAt || activity.createdAt)}</td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="text-center py-8">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <IconFile className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                                                        <p className="text-sm font-medium text-white-dark">
                                                            {roleCodes.includes('INNOVATION_COMMITTEE') ? 'No ideas pending review' : 'No recent activities'}
                                                        </p>
                                                        <p className="text-xs text-white-dark/70 mt-1">
                                                            {roleCodes.includes('INNOVATION_COMMITTEE')
                                                                ? 'Ideas submitted for review will appear here'
                                                                : 'Your activities and requests will appear here'}
                                                        </p>
                                                    </div>
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
                        <div className="space-y-3">
                            {roleCodes.includes('INNOVATION_COMMITTEE') ? (
                                <>
                                    <div className="border border-[#ebedf2] rounded-lg dark:bg-[#1b2e4b] dark:border-[#3b5998] hover:shadow-lg transition-all duration-200 cursor-default bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/20">
                                        <div className="flex items-center justify-between p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="grid place-content-center w-12 h-12 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 text-purple-600 dark:text-purple-400">
                                                    <IconBulb className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-white-dark uppercase tracking-wide">Ideas Under Review</p>
                                                    <p className="text-2xl font-bold text-[#515365] dark:text-white-light mt-1">8</p>
                                                    <p className="text-xs text-white-dark mt-0.5">Pending evaluation</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 dark:bg-purple-500/20">
                                                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">↑</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border border-[#ebedf2] rounded-lg dark:bg-[#1b2e4b] dark:border-[#3b5998] hover:shadow-lg transition-all duration-200 cursor-default bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-900/20">
                                        <div className="flex items-center justify-between p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="grid place-content-center w-12 h-12 rounded-lg bg-success/20 dark:bg-success/30 text-success">
                                                    <IconThumbUp className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-white-dark uppercase tracking-wide">Ideas Approved</p>
                                                    <p className="text-2xl font-bold text-[#515365] dark:text-white-light mt-1">{stats.ideasApproved}</p>
                                                    <p className="text-xs text-white-dark mt-0.5">This quarter</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 dark:bg-success/20">
                                                    <span className="text-lg font-bold text-success">87%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : roleCodes.some((role) => role.includes('PROCUREMENT') || role.includes('BUDGET') || role.includes('EVALUATION')) ? (
                                <>
                                    <div className="border border-[#ebedf2] rounded-lg dark:bg-[#1b2e4b] dark:border-[#3b5998] hover:shadow-lg transition-all duration-200 cursor-default">
                                        <div className="flex items-center justify-between p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="grid place-content-center w-12 h-12 rounded-lg bg-info/20 dark:bg-info/30 text-info">
                                                    <IconClipboardText className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-white-dark uppercase tracking-wide">Evaluations Completed</p>
                                                    <p className="text-2xl font-bold text-[#515365] dark:text-white-light mt-1">{stats.evaluationsCompleted}</p>
                                                    <p className="text-xs text-white-dark mt-0.5">This month</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-info/10 dark:bg-info/20">
                                                    <span className="text-lg font-bold text-info">95%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border border-[#ebedf2] rounded-lg dark:bg-[#1b2e4b] dark:border-[#3b5998] hover:shadow-lg transition-all duration-200 cursor-default">
                                        <div className="flex items-center justify-between p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="grid place-content-center w-12 h-12 rounded-lg bg-success/20 dark:bg-success/30 text-success">
                                                    <IconChecks className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-white-dark uppercase tracking-wide">Approvals Processed</p>
                                                    <p className="text-2xl font-bold text-[#515365] dark:text-white-light mt-1">{stats.approvalsProcessed}</p>
                                                    <p className="text-xs text-white-dark mt-0.5">This month</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 dark:bg-success/20">
                                                    <span className="text-lg font-bold text-success">100%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="border border-[#ebedf2] rounded-lg dark:bg-[#1b2e4b] dark:border-[#3b5998] hover:shadow-lg transition-all duration-200 p-5 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/20">
                                        <div className="flex items-center gap-4">
                                            <div className="grid place-content-center w-12 h-12 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 text-purple-600 dark:text-purple-400">
                                                <IconBulb className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-white-dark uppercase tracking-wide">Ideas Submitted</p>
                                                <p className="text-lg font-bold text-[#515365] dark:text-white-light mt-1">{stats.ideasSubmitted}</p>
                                                <p className="text-xs text-white-dark mt-0.5">Active ideas</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border border-[#ebedf2] rounded-lg dark:bg-[#1b2e4b] dark:border-[#3b5998] hover:shadow-lg transition-all duration-200 p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="grid place-content-center w-12 h-12 rounded-lg bg-primary/20 dark:bg-primary/30 text-primary">
                                                <IconClipboardText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-white-dark uppercase tracking-wide">Requests Submitted</p>
                                                <p className="text-lg font-bold text-[#515365] dark:text-white-light mt-1">{recentActivities.length}</p>
                                                <p className="text-xs text-white-dark mt-0.5">Active requests</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h5 className="font-semibold text-lg dark:text-white-light">Department Access & Permissions</h5>
                                <p className="text-xs text-white-dark mt-1">Roles and access rights assigned to your account</p>
                            </div>
                            <Link to="/users/user-account-settings" className="btn btn-primary btn-sm">
                                <IconSettings className="w-3.5 h-3.5 ltr:mr-1 rtl:ml-1" />
                                Manage Settings
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {roleCodes.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        {roleCodes.includes('PROCUREMENT_MANAGER') && (
                                            <div className="border border-[#ebedf2] dark:border-[#3b5998] rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <h6 className="text-sm font-semibold text-[#515365] dark:text-white-light mb-2">Procurement Manager</h6>
                                                <ul className="space-y-1.5 text-xs text-white-dark">
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                        Full Procurement Access
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                        Request Management
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                        Quote Evaluation
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                        PO Generation
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                        {roleCodes.includes('PROCUREMENT_OFFICER') && (
                                            <div className="border border-[#ebedf2] dark:border-[#3b5998] rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <h6 className="text-sm font-semibold text-[#515365] dark:text-white-light mb-2">Procurement Officer</h6>
                                                <ul className="space-y-1.5 text-xs text-white-dark">
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                                                        Request Processing
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                                                        Quote Processing
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                                                        Vendor Management
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                        {(roleCodes.includes('DEPT_MANAGER') || roleCodes.includes('DEPARTMENT_HEAD')) && (
                                            <div className="border border-[#ebedf2] dark:border-[#3b5998] rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <h6 className="text-sm font-semibold text-[#515365] dark:text-white-light mb-2">
                                                    {roleCodes.includes('DEPARTMENT_HEAD') ? 'Department Head' : 'Department Manager'}
                                                </h6>
                                                <ul className="space-y-1.5 text-xs text-white-dark">
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                                                        Request Approval
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                                                        Budget Review
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                                                        Team Management
                                                    </li>
                                                </ul>
                                            </div>
                                        )}

                                        {roleCodes.includes('INNOVATION_COMMITTEE') && (
                                            <div className="border border-[#ebedf2] dark:border-[#3b5998] rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20">
                                                <h6 className="text-sm font-semibold text-[#515365] dark:text-white-light mb-2 flex items-center gap-2">
                                                    <IconBulb className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                    Innovation Committee
                                                </h6>
                                                <ul className="space-y-1.5 text-xs text-white-dark">
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                        Review Submitted Ideas
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                        Approve/Reject Ideas
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                        Promote to Projects
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                        {roleCodes.includes('BUDGET_MANAGER') && (
                                            <div className="border border-[#ebedf2] dark:border-[#3b5998] rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <h6 className="text-sm font-semibold text-[#515365] dark:text-white-light mb-2">Budget Manager</h6>
                                                <ul className="space-y-1.5 text-xs text-white-dark">
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                                                        Budget Oversight
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                                                        Financial Review
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                                                        Cost Analysis
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                        {roleCodes.includes('EXECUTIVE_DIRECTOR') && (
                                            <div className="border border-[#ebedf2] dark:border-[#3b5998] rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <h6 className="text-sm font-semibold text-[#515365] dark:text-white-light mb-2">Executive Director</h6>
                                                <ul className="space-y-1.5 text-xs text-white-dark">
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
                                                        Final Approvals
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
                                                        Strategic Oversight
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
                                                        System Admin
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-6 p-4 bg-success/10 dark:bg-success/20 rounded-lg border border-success/20 dark:border-success/30">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/30 text-success">
                                                <IconChecks className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Active Account</p>
                                                <p className="text-xs text-white-dark mt-0.5">{getUserRoles()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-4 bg-info/10 dark:bg-info/20 rounded-lg border border-info/20 dark:border-info/30">
                                    <p className="text-sm font-medium text-[#515365] dark:text-white-light">Standard User Access</p>
                                    <p className="text-xs text-white-dark mt-2">You have access to submit ideas and requests. Contact an administrator to request additional permissions.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h5 className="font-semibold text-lg dark:text-white-light">Quick Actions</h5>
                                <p className="text-xs text-white-dark mt-1">Frequently accessed features</p>
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            {/* Innovation Hub Actions - For regular contributors (not committee) */}
                            {!roleCodes.includes('PROCUREMENT_MANAGER') && !roleCodes.includes('PROCUREMENT_OFFICER') && !roleCodes.includes('INNOVATION_COMMITTEE') && (
                                <>
                                    <Link
                                        to="/innovation/ideas/new"
                                        className="flex items-center gap-3 px-4 py-3 bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 dark:border-purple-500/30 rounded-lg hover:bg-purple-500/20 dark:hover:bg-purple-500/30 transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/30 group-hover:bg-purple-500/40 transition-colors">
                                            <IconBulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Submit an Idea</p>
                                            <p className="text-xs text-white-dark mt-0.5">Share your innovative ideas</p>
                                        </div>
                                    </Link>
                                    <Link
                                        to="/innovation/ideas/browse"
                                        className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg hover:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/30 group-hover:bg-blue-500/40 transition-colors">
                                            <IconSearch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Browse Ideas</p>
                                            <p className="text-xs text-white-dark mt-0.5">Explore and vote on ideas</p>
                                        </div>
                                    </Link>
                                    <Link
                                        to="/innovation/ideas/mine"
                                        className="flex items-center gap-3 px-4 py-3 bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30 rounded-lg hover:bg-green-500/20 dark:hover:bg-green-500/30 transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/30 group-hover:bg-green-500/40 transition-colors">
                                            <IconStar className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[#515365] dark:text-white-light">My Ideas</p>
                                            <p className="text-xs text-white-dark mt-0.5">View your submitted ideas</p>
                                        </div>
                                    </Link>
                                </>
                            )}

                            {/* Committee Browse Action - Committee members can only browse and access dashboard */}
                            {roleCodes.includes('INNOVATION_COMMITTEE') && (
                                <Link
                                    to="/innovation/ideas/browse"
                                    className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg hover:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-all group cursor-pointer"
                                >
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/30 group-hover:bg-blue-500/40 transition-colors">
                                        <IconSearch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Browse Ideas</p>
                                        <p className="text-xs text-white-dark mt-0.5">Explore ideas to review</p>
                                    </div>
                                </Link>
                            )}

                            {/* Committee Actions */}
                            {roleCodes.includes('INNOVATION_COMMITTEE') && (
                                <Link
                                    to="/innovation/committee/dashboard"
                                    className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 dark:border-orange-500/30 rounded-lg hover:bg-orange-500/20 dark:hover:bg-orange-500/30 transition-all group cursor-pointer"
                                >
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/30 group-hover:bg-orange-500/40 transition-colors">
                                        <IconClipboardText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Committee Dashboard</p>
                                        <p className="text-xs text-white-dark mt-0.5">Review ideas and make decisions</p>
                                    </div>
                                </Link>
                            )}

                            {/* Procurement Actions */}
                            {(roleCodes.includes('PROCUREMENT_MANAGER') || roleCodes.includes('PROCUREMENT_OFFICER')) && (
                                <>
                                    <Link
                                        to="/apps/requests/new"
                                        className="flex items-center gap-3 px-4 py-3 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/30 group-hover:bg-primary/40 transition-colors">
                                            <IconPlus className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Create New Request</p>
                                            <p className="text-xs text-white-dark mt-0.5">Start a new procurement request</p>
                                        </div>
                                    </Link>

                                    <Link
                                        to="/procurement/manager/assign"
                                        className="flex items-center gap-3 px-4 py-3 bg-success/10 dark:bg-success/20 border border-success/20 dark:border-success/30 rounded-lg hover:bg-success/20 dark:hover:bg-success/30 transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/30 group-hover:bg-success/40 transition-colors">
                                            <IconUsers className="w-5 h-5 text-success" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Assign Requests</p>
                                            <p className="text-xs text-white-dark mt-0.5">Manage request assignments</p>
                                        </div>
                                    </Link>
                                    <Link
                                        to="/procurement/manager/settings"
                                        className="flex items-center gap-3 px-4 py-3 bg-warning/10 dark:bg-warning/20 border border-warning/20 dark:border-warning/30 rounded-lg hover:bg-warning/20 dark:hover:bg-warning/30 transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/30 group-hover:bg-warning/40 transition-colors">
                                            <IconSettings className="w-5 h-5 text-warning" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Load Balancing</p>
                                            <p className="text-xs text-white-dark mt-0.5">Optimize workload distribution</p>
                                        </div>
                                    </Link>
                                </>
                            )}

                            {/* Common Request Action - Only for users with actual procurement role */}
                            {(roleCodes.includes('DEPARTMENT_HEAD') || roleCodes.includes('EXECUTIVE_DIRECTOR')) &&
                                !roleCodes.includes('INNOVATION_COMMITTEE') &&
                                !roleCodes.includes('EVALUATION_COMMITTEE') && (
                                    <Link
                                        to="/apps/requests/new"
                                        className="flex items-center gap-3 px-4 py-3 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/30 group-hover:bg-primary/40 transition-colors">
                                            <IconPlus className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Create Request</p>
                                            <p className="text-xs text-white-dark mt-0.5">Submit a procurement request</p>
                                        </div>
                                    </Link>
                                )}

                            <div className="h-px bg-[#ebedf2] dark:bg-[#3b5998] my-3"></div>

                            <Link
                                to="/users/user-account-settings"
                                className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all group cursor-pointer"
                            >
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 dark:group-hover:bg-gray-600 transition-colors">
                                    <IconSettings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#515365] dark:text-white-light">Account Settings</p>
                                    <p className="text-xs text-white-dark mt-0.5">Update profile information</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
