import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconUser from '../../../components/Icon/IconUser';
import IconMail from '../../../components/Icon/IconMail';
import IconPhone from '../../../components/Icon/IconPhone';

interface OnboardingData {
    // Step 1: Personal Information
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
    department: string;
    
    // Step 2: Role Selection
    primaryRole: string;
    permissions: string[];
    
    // Step 3: Preferences
    language: string;
    timezone: string;
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    
    // Step 4: Profile Picture
    avatar: string;
}

const Onboarding = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Welcome - Complete Your Profile'));
    }, [dispatch]);

    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<OnboardingData>({
        firstName: '',
        lastName: '',
        email: 'john.doe@company.com', // Pre-filled from registration
        phone: '',
        jobTitle: '',
        department: '',
        primaryRole: '',
        permissions: [],
        language: 'en',
        timezone: 'America/New_York',
        notifications: {
            email: true,
            push: true,
            sms: false,
        },
        avatar: '',
    });

    const totalSteps = 4;

    const roles = [
        {
            id: 'requester',
            name: 'Requester',
            description: 'Submit and track procurement requests',
            icon: '📝',
            permissions: ['create_requests', 'view_own_requests', 'edit_draft_requests'],
        },
        {
            id: 'approver',
            name: 'Approver',
            description: 'Review and approve procurement requests',
            icon: '✅',
            permissions: ['view_all_requests', 'approve_requests', 'reject_requests', 'add_comments'],
        },
        {
            id: 'procurement_officer',
            name: 'Procurement Officer',
            description: 'Manage RFQs, suppliers, and purchase orders',
            icon: '🛒',
            permissions: ['manage_rfq', 'manage_suppliers', 'create_po', 'view_all_requests', 'manage_evaluations'],
        },
        {
            id: 'finance',
            name: 'Finance Officer',
            description: 'Handle payments and financial approvals',
            icon: '💰',
            permissions: ['view_all_requests', 'approve_payments', 'view_financial_reports', 'manage_budgets'],
        },
        {
            id: 'admin',
            name: 'System Administrator',
            description: 'Full system access and user management',
            icon: '👑',
            permissions: ['full_access', 'manage_users', 'system_settings', 'view_audit_logs'],
        },
    ];

    const departments = [
        'Procurement',
        'Finance',
        'Operations',
        'IT & Technology',
        'Human Resources',
        'Sales & Marketing',
        'Legal & Compliance',
        'Administration',
        'Other',
    ];

    const handleChange = (field: keyof OnboardingData, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleNotificationChange = (type: keyof OnboardingData['notifications']) => {
        setFormData((prev) => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [type]: !prev.notifications[type],
            },
        }));
    };

    const handleRoleSelect = (roleId: string) => {
        const role = roles.find((r) => r.id === roleId);
        if (role) {
            setFormData((prev) => ({
                ...prev,
                primaryRole: roleId,
                permissions: role.permissions,
            }));
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData((prev) => ({
                    ...prev,
                    avatar: reader.result as string,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const validateStep = (step: number): boolean => {
        setError('');
        
        switch (step) {
            case 1:
                if (!formData.firstName || !formData.lastName || !formData.email || !formData.department) {
                    setError('Please fill in all required fields');
                    return false;
                }
                break;
            case 2:
                if (!formData.primaryRole) {
                    setError('Please select your primary role');
                    return false;
                }
                break;
            case 3:
                // All fields optional
                break;
            case 4:
                // Avatar optional
                break;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
            } else {
                handleComplete();
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setError('');
        }
    };

    const handleComplete = async () => {
        setIsLoading(true);
        setError('');

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Mark onboarding as complete
            localStorage.setItem('onboardingComplete', 'true');
            localStorage.setItem('userProfile', JSON.stringify(formData));

            // Redirect to dashboard
            navigate('/');
        } catch (err) {
            setError('Failed to complete onboarding. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-5">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <IconUser className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Personal Information</h2>
                            <p className="text-gray-600 dark:text-gray-400">Let's get to know you better</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    First Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => handleChange('firstName', e.target.value)}
                                    className="form-input"
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Last Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => handleChange('lastName', e.target.value)}
                                    className="form-input"
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Email Address <span className="text-danger">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                                    <IconMail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="form-input pl-10"
                                    placeholder="john.doe@company.com"
                                    disabled
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed after registration</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                                    <IconPhone className="w-5 h-5" />
                                </div>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className="form-input pl-10"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Job Title</label>
                            <input
                                type="text"
                                value={formData.jobTitle}
                                onChange={(e) => handleChange('jobTitle', e.target.value)}
                                className="form-input"
                                placeholder="e.g., Procurement Manager"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Department <span className="text-danger">*</span>
                            </label>
                            <select
                                value={formData.department}
                                onChange={(e) => handleChange('department', e.target.value)}
                                className="form-select"
                                required
                            >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept} value={dept}>
                                        {dept}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-5">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">🎯</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Select Your Role</h2>
                            <p className="text-gray-600 dark:text-gray-400">Choose the role that best describes your responsibilities</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {roles.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => handleRoleSelect(role.id)}
                                    className={`text-left p-5 rounded-lg border-2 transition-all ${
                                        formData.primaryRole === role.id
                                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="text-4xl flex-shrink-0">{role.icon}</div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{role.name}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{role.description}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {role.permissions.map((perm) => (
                                                    <span
                                                        key={perm}
                                                        className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                                    >
                                                        {perm.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {formData.primaryRole === role.id && (
                                            <div className="flex-shrink-0">
                                                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="p-4 bg-info-light/10 border border-info rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                <strong>Note:</strong> Your role determines your access level and available features. You can request role changes later from your administrator.
                            </p>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-5">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">⚙️</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Preferences</h2>
                            <p className="text-gray-600 dark:text-gray-400">Customize your experience</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Language</label>
                            <select value={formData.language} onChange={(e) => handleChange('language', e.target.value)} className="form-select">
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="zh">Chinese</option>
                                <option value="ja">Japanese</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                            <select value={formData.timezone} onChange={(e) => handleChange('timezone', e.target.value)} className="form-select">
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="America/Chicago">Central Time (CT)</option>
                                <option value="America/Denver">Mountain Time (MT)</option>
                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                <option value="Europe/London">London (GMT)</option>
                                <option value="Europe/Paris">Paris (CET)</option>
                                <option value="Asia/Tokyo">Tokyo (JST)</option>
                                <option value="Asia/Shanghai">Shanghai (CST)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Notification Preferences</label>
                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div className="flex items-center gap-3">
                                        <IconMail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">Email Notifications</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Receive updates via email</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formData.notifications.email}
                                        onChange={() => handleNotificationChange('email')}
                                        className="form-checkbox"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                            />
                                        </svg>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">Push Notifications</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Get browser notifications</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formData.notifications.push}
                                        onChange={() => handleNotificationChange('push')}
                                        className="form-checkbox"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div className="flex items-center gap-3">
                                        <IconPhone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">SMS Notifications</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Receive text messages for urgent items</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formData.notifications.sms}
                                        onChange={() => handleNotificationChange('sms')}
                                        className="form-checkbox"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-5">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">📸</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profile Picture</h2>
                            <p className="text-gray-600 dark:text-gray-400">Add a photo to personalize your profile</p>
                        </div>

                        <div className="flex flex-col items-center space-y-6">
                            <div className="relative">
                                {formData.avatar ? (
                                    <img src={formData.avatar} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-primary/20" />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-4 border-gray-300 dark:border-gray-600">
                                        <IconUser className="w-16 h-16 text-gray-400" />
                                    </div>
                                )}
                                <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-dark transition">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                                </label>
                            </div>

                            <div className="text-center">
                                <label className="btn btn-outline-primary cursor-pointer">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    Choose Photo
                                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                                </label>
                                <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (max 5MB)</p>
                            </div>

                            {formData.avatar && (
                                <button
                                    onClick={() => handleChange('avatar', '')}
                                    className="text-sm text-danger hover:text-danger-dark flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Remove Photo
                                </button>
                            )}
                        </div>

                        <div className="mt-8 p-4 bg-success-light/10 border border-success rounded-lg">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                You're All Set!
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                Click "Complete Setup" to start using the Procurement Management System with your configured profile and preferences.
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/5 dark:from-gray-900 dark:via-black dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        {[1, 2, 3, 4].map((step) => (
                            <div key={step} className="flex items-center flex-1">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                                        currentStep >= step
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                    {currentStep > step ? (
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        step
                                    )}
                                </div>
                                {step < 4 && (
                                    <div
                                        className={`flex-1 h-1 mx-2 ${
                                            currentStep > step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                    ></div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Personal Info</span>
                        <span>Role Selection</span>
                        <span>Preferences</span>
                        <span>Profile Photo</span>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm">
                            {error}
                        </div>
                    )}

                    {renderStepContent()}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            className="btn btn-outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Step {currentStep} of {totalSteps}
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={isLoading}
                            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5"></span>
                                    Saving...
                                </span>
                            ) : currentStep === totalSteps ? (
                                <>
                                    Complete Setup
                                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </>
                            ) : (
                                <>
                                    Next
                                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Skip Option */}
                <div className="text-center mt-6">
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light"
                    >
                        Skip for now (you can complete this later)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
