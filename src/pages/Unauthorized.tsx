import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUserRoles, selectPrimaryUserRole } from '../store/authSlice';
import { UserRole } from '../types/auth';

const Unauthorized = () => {
    const userRoles = useSelector(selectUserRoles);
    const primaryRole = useSelector(selectPrimaryUserRole);

    const getDashboardPath = () => {
        switch (primaryRole) {
            case UserRole.DEPARTMENT_HEAD:
                return '/procurement/department-head-dashboard';
            case UserRole.PROCUREMENT_MANAGER:
                return '/procurement/manager';
            case UserRole.EXECUTIVE_DIRECTOR:
                return '/procurement/executive-director-dashboard';
            case UserRole.SUPPLIER:
                return '/supplier';
            case UserRole.FINANCE:
                return '/finance';
            default:
                return '/';
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
            <div className="text-center p-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20">
                <div className="mb-6">
                    <div className="text-8xl mb-4">🚫</div>
                    <h1 className="text-4xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-xl text-white/80">
                        You don't have permission to access this page.
                    </p>
                </div>

                <div className="mb-8">
                    <p className="text-white/70 mb-4">
                        Your roles: <span className="font-semibold text-white">{userRoles.join(', ')}</span>
                    </p>
                    <p className="text-white/70">
                        Please contact your administrator if you believe this is an error.
                    </p>
                </div>

                <div className="flex gap-4 justify-center">
                    <Link 
                        to={getDashboardPath()} 
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/80 transition duration-300 font-semibold"
                    >
                        Go to Dashboard
                    </Link>
                    <Link 
                        to="/auth/login" 
                        className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition duration-300 font-semibold border border-white/30"
                    >
                        Login as Different User
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;