import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, UserRole, LoginCredentials, AuthResponse } from '../types/auth';
import authService from '../services/authService';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// Rehydrate minimal auth state from localStorage so role-gated UI (e.g., Admin Settings)
// is immediately available after refresh. We persist `auth_user` at login.
let hydratedUser: User | null = null;
try {
    // Prefer sessionStorage (active session) then localStorage fallback
    const rawSession = sessionStorage.getItem('auth_user');
    const rawLocal = localStorage.getItem('auth_user');
    const raw = rawSession || rawLocal;
    hydratedUser = raw ? (JSON.parse(raw) as User) : null;
    // Fallback: legacy userProfile shape used elsewhere
    if (!hydratedUser) {
        const legacy = localStorage.getItem('userProfile');
        if (legacy) {
            const lp = JSON.parse(legacy);
            hydratedUser = {
                id: lp.id,
                email: lp.email,
                full_name: lp.name || lp.email,
                department_id: lp.department?.id,
                department_name: lp.department?.name,
                status: 'active',
                roles: lp.roles || (lp.primaryRole ? [lp.primaryRole] : []),
                last_login_at: undefined,
                created_at: undefined,
                updated_at: undefined,
            };
        }
    }
} catch {
    hydratedUser = null;
}

// Support both legacy 'token' and new 'auth_token' keys (session or local storage)
const cachedToken =
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('auth_token') ||
    localStorage.getItem('auth_token');

const initialState: AuthState = {
    user: hydratedUser,
    token: cachedToken || null,
    // Consider user authenticated if any cached token exists
    isAuthenticated: !!cachedToken,
    isLoading: false,
    error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials: LoginCredentials, { rejectWithValue }) => {
        try {
            const response = await authService.login(credentials);
            if (response.success && response.user && response.token) {
                localStorage.setItem('token', response.token);
                return response;
            } else {
                return rejectWithValue(response.message || 'Login failed');
            }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Login failed');
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { dispatch }) => {
        localStorage.removeItem('token');
        return null;
    }
);

export const verifyToken = createAsyncThunk(
    'auth/verifyToken',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return rejectWithValue('No token found');
            }
            const response = await authService.verifyToken(token);
            return response;
        } catch (error: any) {
            localStorage.removeItem('token');
            return rejectWithValue(error.message || 'Token verification failed');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
    },
    extraReducers: (builder) => {
        builder
            // Login cases
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user!;
                state.token = action.payload.token!;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isAuthenticated = false;
            })
            // Logout cases
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                state.error = null;
            })
            // Token verification cases
            .addCase(verifyToken.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(verifyToken.fulfilled, (state, action) => {
                state.isLoading = false;
                if (action.payload.success && action.payload.user) {
                    state.user = action.payload.user;
                    state.isAuthenticated = true;
                }
            })
            .addCase(verifyToken.rejected, (state) => {
                state.isLoading = false;
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
            });
    },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectUserRoles = (state: { auth: AuthState }) => state.auth.user?.roles || [];
export const selectPrimaryUserRole = (state: { auth: AuthState }) => state.auth.user?.roles?.[0];
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;