/**
 * Authentication Store for V2 Auth System
 *
 * Zustand store with persistence for managing auth state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authServiceV2, type IRegisterRequestData, type IPendingUser, type IRegistrationCounts } from '../../shared/services/modules/authServiceV2';
import type { IUser, IRegisterRequest } from '../../../types/auth.types';

// Registration request result type
interface IRegisterRequestResult {
  id: number;
  email: string;
  status: string;
  message?: string;
}

// Auth State Interface
interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // Registration approval workflow state
  registrationPending: boolean;
  registrationResult: IRegisterRequestResult | null;
  pendingUsers: IPendingUser[];
  registrationCounts: IRegistrationCounts | null;
}

// Auth Actions Interface
interface AuthActions {
  initialize: () => Promise<void>;
  login: (email: string, password: string, tenantId?: number) => Promise<IUser>;
  register: (data: IRegisterRequest) => Promise<IUser>;
  registerRequest: (data: IRegisterRequestData) => Promise<IRegisterRequestResult>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  setUser: (user: IUser | null) => void;
  refreshUser: () => Promise<void>;
  // Registration approval workflow actions
  clearRegistrationState: () => void;
  fetchPendingUsers: () => Promise<void>;
  fetchRegistrationCounts: () => Promise<void>;
  approveUser: (userId: number, roleName?: string) => Promise<void>;
  rejectUser: (userId: number, reason?: string) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  // Registration approval workflow initial state
  registrationPending: false,
  registrationResult: null,
  pendingUsers: [],
  registrationCounts: null,
};

/**
 * V2 Authentication Store
 */
export const useAuthStoreV2 = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Initialize auth state from stored token
       */
      initialize: async () => {
        const token = localStorage.getItem('auth_token_v2');

        if (!token) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });

        try {
          const response = await authServiceV2.verifyToken(token);

          if (response.success && response.data) {
            set({
              user: response.data,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // Token invalid - clear everything
            localStorage.removeItem('auth_token_v2');
            set({ ...initialState, isLoading: false });
          }
        } catch (error) {
          console.error('[AuthStoreV2] Initialize error:', error);
          localStorage.removeItem('auth_token_v2');
          set({ ...initialState, isLoading: false });
        }
      },

      /**
       * Login with email and password
       */
      login: async (email: string, password: string, tenantId?: number) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authServiceV2.login({ email, password, tenantId });

          if (!response.success || !response.data) {
            const errorMessage = response.error || response.message || 'Login failed';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          const { user, token } = response.data;

          // Store token
          localStorage.setItem('auth_token_v2', token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return user;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      /**
       * Register new user
       */
      register: async (data: IRegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authServiceV2.register(data);

          if (!response.success || !response.data) {
            const errorMessage = response.error || response.message || 'Registration failed';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          const { user, token } = response.data;

          // Store token
          localStorage.setItem('auth_token_v2', token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return user;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      /**
       * Submit registration request (approval workflow)
       * User will be created with PENDING status
       */
      registerRequest: async (data: IRegisterRequestData) => {
        set({ isLoading: true, error: null, registrationPending: false, registrationResult: null });

        try {
          const response = await authServiceV2.registerRequest(data);

          if (!response.success || !response.data) {
            const errorMessage = response.error || response.message || 'Registration request failed';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          const result: IRegisterRequestResult = {
            id: response.data.id,
            email: response.data.email,
            status: response.data.status,
            message: response.message,
          };

          set({
            registrationPending: true,
            registrationResult: result,
            isLoading: false,
            error: null,
          });

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration request failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      /**
       * Logout user
       */
      logout: () => {
        // Call logout API (fire and forget)
        authServiceV2.logout().catch(console.error);

        // Clear stored token
        localStorage.removeItem('auth_token_v2');

        // Reset state
        set(initialState);
      },

      /**
       * Request password reset
       */
      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authServiceV2.forgotPassword(email);

          if (!response.success) {
            const errorMessage = response.error || response.message || 'Failed to send reset email';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          set({ isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      /**
       * Reset password with token
       */
      resetPassword: async (token: string, newPassword: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authServiceV2.resetPassword(token, newPassword);

          if (!response.success) {
            const errorMessage = response.error || response.message || 'Failed to reset password';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          set({ isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      /**
       * Clear error message
       */
      clearError: () => set({ error: null }),

      /**
       * Manually set user (for external updates)
       */
      setUser: (user: IUser | null) => set({
        user,
        isAuthenticated: !!user,
      }),

      /**
       * Refresh user data from API
       */
      refreshUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await authServiceV2.getCurrentUser();

          if (response.success && response.data) {
            set({ user: response.data });
          }
        } catch (error) {
          console.error('[AuthStoreV2] Refresh user error:', error);
        }
      },

      // =====================================================================
      // REGISTRATION APPROVAL WORKFLOW ACTIONS
      // =====================================================================

      /**
       * Clear registration state (after user navigates away from pending page)
       */
      clearRegistrationState: () => set({
        registrationPending: false,
        registrationResult: null,
      }),

      /**
       * Fetch pending user registrations (Admin only)
       */
      fetchPendingUsers: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await authServiceV2.getPendingRegistrations();

          if (!response.success) {
            const errorMessage = response.error || response.message || 'Failed to fetch pending registrations';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          set({
            pendingUsers: response.data || [],
            isLoading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pending registrations';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      /**
       * Fetch registration counts by status (Admin only)
       */
      fetchRegistrationCounts: async () => {
        try {
          const response = await authServiceV2.getRegistrationCounts();

          if (response.success && response.data) {
            set({ registrationCounts: response.data });
          }
        } catch (error) {
          console.error('[AuthStoreV2] Fetch registration counts error:', error);
        }
      },

      /**
       * Approve a pending user registration (Admin only)
       */
      approveUser: async (userId: number, roleName?: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authServiceV2.approveRegistration(userId, roleName);

          if (!response.success) {
            const errorMessage = response.error || response.message || 'Failed to approve registration';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          // Remove user from pending list
          const { pendingUsers } = get();
          set({
            pendingUsers: pendingUsers.filter(u => u.id !== userId),
            isLoading: false,
          });

          // Refresh counts
          get().fetchRegistrationCounts();

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to approve registration';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      /**
       * Reject a pending user registration (Admin only)
       */
      rejectUser: async (userId: number, reason?: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authServiceV2.rejectRegistration(userId, reason);

          if (!response.success) {
            const errorMessage = response.error || response.message || 'Failed to reject registration';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          // Remove user from pending list
          const { pendingUsers } = get();
          set({
            pendingUsers: pendingUsers.filter(u => u.id !== userId),
            isLoading: false,
          });

          // Refresh counts
          get().fetchRegistrationCounts();

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reject registration';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'dj-auth-v2-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useUser = () => useAuthStoreV2((state) => state.user);
export const useIsAuthenticated = () => useAuthStoreV2((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStoreV2((state) => state.isLoading);
export const useAuthError = () => useAuthStoreV2((state) => state.error);

// Registration workflow selectors
export const useRegistrationPending = () => useAuthStoreV2((state) => state.registrationPending);
export const useRegistrationResult = () => useAuthStoreV2((state) => state.registrationResult);
export const usePendingUsers = () => useAuthStoreV2((state) => state.pendingUsers);
export const useRegistrationCounts = () => useAuthStoreV2((state) => state.registrationCounts);

// Permission check helper
export const useHasPermission = (resource: string, action: string): boolean => {
  const user = useUser();
  if (!user?.role?.permissions) return false;

  const resourcePerms = (user.role.permissions as any)[resource];
  if (!resourcePerms) return false;

  return (resourcePerms as Record<string, boolean>)[action] === true;
};

// Role check helpers (V1 naming: Admin, Requester, Approver, Assignee)
export const useIsSuperAdmin = (): boolean => {
  const user = useUser();
  return user?.roleName === 'Admin';
};

export const useIsOrgAdmin = (): boolean => {
  const user = useUser();
  return user?.roleName === 'Admin' || user?.roleName === 'Requester';
};

export const useIsTeamLead = (): boolean => {
  const user = useUser();
  return user?.roleName === 'Admin' || user?.roleName === 'Requester' || user?.roleName === 'Approver';
};

export default useAuthStoreV2;
