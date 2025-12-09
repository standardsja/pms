import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import { getToken, getUser } from '../../../utils/auth';
import { getApiUrl } from '../../../config/api';
import { computeRoleContext, AccountSettingsVisibility } from '../../../utils/roleVisibilityHelper';
import Swal from 'sweetalert2';
import IconHome from '../../../components/Icon/IconHome';
import IconDollarSignCircle from '../../../components/Icon/IconDollarSignCircle';
import IconUser from '../../../components/Icon/IconUser';
import IconPhone from '../../../components/Icon/IconPhone';
import IconLinkedin from '../../../components/Icon/IconLinkedin';
import IconTwitter from '../../../components/Icon/IconTwitter';
import IconFacebook from '../../../components/Icon/IconFacebook';
import IconGithub from '../../../components/Icon/IconGithub';
import IconBell from '../../../components/Icon/IconBell';
import IconLock from '../../../components/Icon/IconLock';

const AccountSetting = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: IRootState) => state.auth);
    const [tabs, setTabs] = useState<string>('home');
    const [profileData, setProfileData] = useState<any>(null);
    const [roleContext, setRoleContext] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        jobTitle: '',
        department: '',
        country: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        employeeId: '',
        supervisor: '',
    });
    const [originalFormData, setOriginalFormData] = useState({ ...formData });
    const [profileImage, setProfileImage] = useState<string>('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isLdapUser, setIsLdapUser] = useState(false);
    const [useProfileImage, setUseProfileImage] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Account Settings'));
    }, [dispatch]);

    useEffect(() => {
        // Restore avatar preference from localStorage ONLY if user doesn't have a profile image
        // Once they upload an image, we'll auto-enable photo mode
        const savedMode = typeof window !== 'undefined' ? localStorage.getItem('profileAvatarMode') : null;
        if (savedMode === 'photo') {
            setUseProfileImage(true);
        }
    }, []);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const token = getToken();
                const currentUser = getUser();

                if (!token || !currentUser) {
                    setIsLoading(false);
                    return;
                }

                // Fetch user profile from API (uses /api/auth/me)
                const response = await fetch(getApiUrl('/api/auth/me'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();

                    setProfileData(data);
                    setProfileImage(data.profileImage || '');

                    // CRITICAL: If user has a profileImage in database, always show it
                    if (data.profileImage) {
                        setUseProfileImage(true);
                    } else {
                        setUseProfileImage(false);
                    }

                    // Detect if user is LDAP-synced (has ldapDN)
                    setIsLdapUser(!!data.ldapDN);
                    const userData = {
                        fullName: data.name || '',
                        jobTitle: data.jobTitle || '',
                        department: data.department?.name || '',
                        country: data.country || '',
                        address: data.address || '',
                        city: data.city || '',
                        phone: data.phone || '',
                        email: data.email || '',
                        employeeId: data.employeeId || '',
                        supervisor: data.supervisor || '',
                    };
                    setFormData(userData);
                    setOriginalFormData(userData);

                    // Compute role context for visibility rules
                    const context = computeRoleContext(data.roles);
                    setRoleContext(context);
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileData();
        // Poll for updates every 30 seconds to catch LDAP changes from admin
        const intervalId = setInterval(fetchProfileData, 30000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        // Persist avatar preference
        if (typeof window !== 'undefined') {
            localStorage.setItem('profileAvatarMode', useProfileImage ? 'photo' : 'initials');
        }
    }, [useProfileImage]);

    useEffect(() => {
        // If no profile image is available, force initials mode
        if (!profileImage) {
            setUseProfileImage(false);
        }
    }, [profileImage]);

    const shouldShowPhoto = useProfileImage && Boolean(profileImage);

    const toggleAvatarMode = () => {
        if (profileImage) {
            setUseProfileImage((prev) => !prev);
        }
    };

    const toggleTabs = (name: string) => {
        setTabs(name);
    };

    const handleFormChange = (e: any) => {
        const { id, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const token = getToken();
            if (!token) {
                Swal.fire({
                    icon: 'error',
                    title: 'Authentication Error',
                    text: 'Your session has expired. Please log in again.',
                    confirmButtonColor: '#3b82f6',
                });
                return;
            }

            // Send updated profile data to backend (excluding LDAP-managed fields)
            const response = await fetch(getApiUrl('/api/auth/profile'), {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // For LDAP users, only send editable fields
                    // LDAP-managed fields (name, email, jobTitle for LDAP users) are not sent
                    name: isLdapUser ? undefined : formData.fullName,
                    jobTitle: isLdapUser ? undefined : formData.jobTitle,
                    country: formData.country,
                    address: formData.address,
                    city: formData.city,
                    phone: isLdapUser ? undefined : formData.phone,
                    employeeId: formData.employeeId,
                    supervisor: formData.supervisor,
                }),
            });

            if (response.ok) {
                setOriginalFormData(formData);
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Your profile has been updated successfully!',
                    confirmButtonColor: '#3b82f6',
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Save Failed',
                    text: 'We encountered an issue saving your changes. Please try again.',
                    confirmButtonColor: '#3b82f6',
                });
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An unexpected error occurred while saving your profile. Please try again.',
                confirmButtonColor: '#3b82f6',
            });
        } finally {
            setIsSaving(false);
        }
    };
    const handleCancel = () => {
        setFormData(originalFormData);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid File Type',
                text: 'Please select a valid image file (JPG, PNG, GIF, etc.).',
                confirmButtonColor: '#3b82f6',
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({
                icon: 'warning',
                title: 'File Too Large',
                text: 'Your image must be less than 5MB. Please choose a smaller file.',
                confirmButtonColor: '#3b82f6',
            });
            return;
        }

        try {
            setIsUploadingImage(true);
            const token = getToken();
            if (!token) {
                Swal.fire({
                    icon: 'error',
                    title: 'Authentication Error',
                    text: 'Your session has expired. Please log in again.',
                    confirmButtonColor: '#3b82f6',
                });
                return;
            }

            const formData = new FormData();
            formData.append('profileImage', file);

            const response = await fetch(getApiUrl('/api/auth/profile-image'), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setProfileImage(data.profileImage);
                setUseProfileImage(true);

                // Dispatch custom event so Header component can update
                window.dispatchEvent(new CustomEvent('profileImageUpdated', { detail: { profileImage: data.profileImage } }));

                // Refetch full profile to ensure persistence
                setTimeout(async () => {
                    try {
                        const token = getToken();
                        const response = await fetch(getApiUrl('/api/auth/me'), {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        });
                        if (response.ok) {
                            const updatedData = await response.json();
                            setProfileImage(updatedData.profileImage || '');
                        }
                    } catch (error) {
                        console.error('Error refetching profile:', error);
                    }
                }, 500);

                Swal.fire({
                    icon: 'success',
                    title: 'Upload Successful',
                    text: 'Your profile picture has been updated!',
                    confirmButtonColor: '#3b82f6',
                });
            } else {
                let errorText = await response.text();
                try {
                    const parsed = JSON.parse(errorText);
                    if (parsed?.message) {
                        errorText = parsed.message;
                    }
                } catch (_e) {
                    // keep raw text
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Upload Failed',
                    text: errorText || 'We were unable to upload your profile picture. Please try again.',
                    confirmButtonColor: '#3b82f6',
                });
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            Swal.fire({
                icon: 'error',
                title: 'Upload Error',
                text: 'An unexpected error occurred while uploading your image. Please try again.',
                confirmButtonColor: '#3b82f6',
            });
        } finally {
            setIsUploadingImage(false);
        }
    };

    const getInitials = (name: string): string => {
        if (!name) return 'U';
        const names = name.trim().split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';
        // Remove existing timestamp if present
        const cleanPath = imagePath.split('?')[0];
        // Always add fresh timestamp to prevent caching
        const timestamp = new Date().getTime();
        if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
            return `${cleanPath}?t=${timestamp}`;
        }
        return `${getApiUrl(cleanPath)}?t=${timestamp}`;
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="#" className="text-primary hover:underline">
                        Users
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Account Settings</span>
                </li>
            </ul>
            <div className="pt-5">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Settings</h5>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div>
                        <div className="mb-5">
                            <ul className="mb-5 overflow-y-auto whitespace-nowrap border-b border-[#ebedf2] font-semibold dark:border-[#191e3a] sm:flex">
                                <li className="inline-block">
                                    <button
                                        onClick={() => setTabs('home')}
                                        className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tabs === 'home' ? '!border-primary text-primary' : ''}`}
                                    >
                                        <IconHome />
                                        Home
                                    </button>
                                </li>
                                <li className="inline-block">
                                    <button
                                        onClick={() => setTabs('preferences')}
                                        className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tabs === 'preferences' ? '!border-primary text-primary' : ''}`}
                                    >
                                        <IconUser className="w-5 h-5" />
                                        Preferences
                                    </button>
                                </li>
                            </ul>
                        </div>
                        {tabs === 'home' ? (
                            <div>
                                {isLdapUser && (
                                    <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                                        <p className="text-sm text-blue-800 dark:text-blue-200">
                                            <strong>ℹ️ LDAP Integration:</strong> Your account is synchronized with LDAP. Some fields are read-only and managed by your directory administrator. You can
                                            still edit local profile information below.
                                        </p>
                                    </div>
                                )}
                                {/* LDAP Profile Summary Header */}
                                <div className="mb-5 p-5 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                        {/* Profile Avatar */}
                                        <div className="flex-shrink-0">
                                            <div className="relative w-16 h-16 md:w-20 md:h-20">
                                                {shouldShowPhoto ? (
                                                    <img src={getImageUrl(profileImage)} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-primary" />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-white text-lg md:text-xl font-bold border-2 border-primary">
                                                        {getInitials(profileData?.name || formData.fullName)}
                                                    </div>
                                                )}
                                            </div>
                                            {profileImage && (
                                                <button type="button" className="mt-2 text-xs text-primary hover:underline" onClick={toggleAvatarMode}>
                                                    {shouldShowPhoto ? 'Use initials' : 'Use photo'}
                                                </button>
                                            )}
                                        </div>
                                        {/* Profile Information */}
                                        <div className="flex-1">
                                            <div className="mb-2">
                                                <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{formData.fullName || 'User Profile'}</h5>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{formData.email}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-sm">
                                                {formData.jobTitle && (
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">Position:</span>{' '}
                                                        <span className="font-medium text-gray-800 dark:text-gray-100">{formData.jobTitle}</span>
                                                    </div>
                                                )}
                                                {formData.department && (
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">Department:</span>{' '}
                                                        <span className="font-medium text-gray-800 dark:text-gray-100">{formData.department}</span>
                                                    </div>
                                                )}
                                                {formData.phone && (
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">Phone:</span>{' '}
                                                        <span className="font-medium text-gray-800 dark:text-gray-100">{formData.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {isLdapUser && profileData?.ldapDN && (
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">LDAP Account • Last updated: {new Date(profileData.updatedAt).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                                    <h6 className="text-lg font-bold mb-5">General Information</h6>
                                    <div className="flex flex-col sm:flex-row">
                                        <div className="ltr:sm:mr-4 rtl:sm:ml-4 w-full sm:w-2/12 mb-5">
                                            <div className="relative w-20 h-20 md:w-32 md:h-32 mx-auto">
                                                {shouldShowPhoto ? (
                                                    <img src={getImageUrl(profileImage)} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-white text-2xl md:text-4xl font-bold">
                                                        {getInitials(formData.fullName)}
                                                    </div>
                                                )}
                                                {profileImage && (
                                                    <button
                                                        type="button"
                                                        className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-primary hover:underline whitespace-nowrap"
                                                        onClick={toggleAvatarMode}
                                                    >
                                                        {shouldShowPhoto ? 'Use initials' : 'Use photo'}
                                                    </button>
                                                )}
                                                <label
                                                    htmlFor="profile-image-upload"
                                                    className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary-dark transition-colors"
                                                    title="Upload profile picture"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                                        />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </label>
                                                <input id="profile-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
                                                {isUploadingImage && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div>
                                                <label htmlFor="fullName">Full Name {isLdapUser && <span className="text-xs text-gray-500">(LDAP)</span>}</label>
                                                <input
                                                    id="fullName"
                                                    type="text"
                                                    placeholder="Enter full name"
                                                    className="form-input"
                                                    value={formData.fullName}
                                                    onChange={handleFormChange}
                                                    disabled={isLdapUser}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="jobTitle">Job Title {isLdapUser && <span className="text-xs text-gray-500">(LDAP)</span>}</label>
                                                <input
                                                    id="jobTitle"
                                                    type="text"
                                                    placeholder="Enter job title"
                                                    className="form-input"
                                                    value={formData.jobTitle}
                                                    onChange={handleFormChange}
                                                    disabled={isLdapUser}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="email">Email {isLdapUser && <span className="text-xs text-gray-500">(LDAP)</span>}</label>
                                                <input
                                                    id="email"
                                                    type="email"
                                                    placeholder="Enter email address"
                                                    className="form-input"
                                                    value={formData.email}
                                                    onChange={handleFormChange}
                                                    disabled={isLdapUser}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="department">Department {isLdapUser && <span className="text-xs text-gray-500">(LDAP)</span>}</label>
                                                <input id="department" type="text" placeholder="Department (read-only)" className="form-input" value={formData.department} disabled />
                                            </div>
                                            <div>
                                                <label htmlFor="country">Country</label>
                                                <input id="country" type="text" placeholder="Enter country" className="form-input" value={formData.country} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label htmlFor="address">Office Address</label>
                                                <input id="address" type="text" placeholder="Enter office address" className="form-input" value={formData.address} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label htmlFor="city">City</label>
                                                <input id="city" type="text" placeholder="Enter city" className="form-input" value={formData.city} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label htmlFor="phone">Phone</label>
                                                <input
                                                    id="phone"
                                                    type="tel"
                                                    placeholder="Enter phone number"
                                                    className="form-input"
                                                    value={formData.phone}
                                                    onChange={handleFormChange}
                                                    disabled={isLdapUser}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="employeeId">Employee ID</label>
                                                <input id="employeeId" type="text" placeholder="Enter employee ID" className="form-input" value={formData.employeeId} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label htmlFor="supervisor">Reporting To</label>
                                                <input
                                                    id="supervisor"
                                                    type="text"
                                                    placeholder="Enter reporting manager name"
                                                    className="form-input"
                                                    value={formData.supervisor}
                                                    onChange={handleFormChange}
                                                />
                                            </div>
                                            <div className="sm:col-span-2 mt-3 flex gap-3">
                                                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                <button type="button" className="btn btn-outline-primary" onClick={handleCancel} disabled={isSaving}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                                {roleContext && AccountSettingsVisibility.shouldShowProcurementPermissions(roleContext) && (
                                    <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 bg-white dark:bg-black">
                                        <h6 className="text-lg font-bold mb-5">Procurement Access & Permissions</h6>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-3">
                                                <label className="inline-flex cursor-pointer">
                                                    <input type="checkbox" className="form-checkbox" defaultChecked />
                                                    <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Create RFQs</span>
                                                </label>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="inline-flex cursor-pointer">
                                                    <input type="checkbox" className="form-checkbox" defaultChecked />
                                                    <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Evaluate Quotes</span>
                                                </label>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="inline-flex cursor-pointer">
                                                    <input type="checkbox" className="form-checkbox" defaultChecked />
                                                    <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Generate Purchase Orders</span>
                                                </label>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="inline-flex cursor-pointer">
                                                    <input type="checkbox" className="form-checkbox" defaultChecked />
                                                    <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Manage Suppliers</span>
                                                </label>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="inline-flex cursor-pointer">
                                                    <input type="checkbox" className="form-checkbox" defaultChecked />
                                                    <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">View Reports</span>
                                                </label>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="inline-flex cursor-pointer">
                                                    <input type="checkbox" className="form-checkbox" />
                                                    <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Approve Payments</span>
                                                </label>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        ) : (
                            ''
                        )}
                        {tabs === 'preferences' ? (
                            <div className="switch">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="panel space-y-5">
                                        <h5 className="font-semibold text-lg mb-4">Public Profile</h5>
                                        <p>
                                            Your <span className="text-primary">Profile</span> will be visible to anyone on the network.
                                        </p>
                                        <label className="w-12 h-6 relative">
                                            <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox1" />
                                            <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                        </label>
                                    </div>
                                    <div className="panel space-y-5">
                                        <h5 className="font-semibold text-lg mb-4">Show my email</h5>
                                        <p>
                                            Your <span className="text-primary">Email</span> will be visible to anyone on the network.
                                        </p>
                                        <label className="w-12 h-6 relative">
                                            <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox2" />
                                            <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                        </label>
                                    </div>
                                    <div className="panel space-y-5">
                                        <h5 className="font-semibold text-lg mb-4">Enable Notifications</h5>
                                        <p>
                                            Receive alerts for <span className="text-primary">updates</span>, submissions, and approval requests.
                                        </p>
                                        <label className="w-12 h-6 relative">
                                            <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox3" defaultChecked />
                                            <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                        </label>
                                    </div>
                                    <div className="panel space-y-5">
                                        <h5 className="font-semibold text-lg mb-4">Hide left navigation</h5>
                                        <p>
                                            Sidebar will be <span className="text-primary">hidden</span> by default
                                        </p>
                                        <label className="w-12 h-6 relative">
                                            <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox4" />
                                            <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                        </label>
                                    </div>
                                    {roleContext && AccountSettingsVisibility.shouldShowProcurementPreferences(roleContext) && (
                                        <>
                                            <div className="panel space-y-5">
                                                <h5 className="font-semibold text-lg mb-4">Auto-Approve Low-Value Items</h5>
                                                <p>
                                                    Automatically approve requests under <span className="text-primary">$1,000</span>
                                                </p>
                                                <label className="w-12 h-6 relative">
                                                    <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox5" />
                                                    <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                                </label>
                                            </div>
                                            <div className="panel space-y-5">
                                                <h5 className="font-semibold text-lg mb-4">Supplier Email Notifications</h5>
                                                <p>
                                                    Send automatic email updates to <span className="text-primary">suppliers</span> on changes
                                                </p>
                                                <label className="w-12 h-6 relative">
                                                    <input
                                                        type="checkbox"
                                                        className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer"
                                                        id="custom_switch_checkbox6"
                                                        defaultChecked
                                                    />
                                                    <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                                </label>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            ''
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountSetting;
