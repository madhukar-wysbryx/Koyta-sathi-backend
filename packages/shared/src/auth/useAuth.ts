import {
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
} from "aws-amplify/auth";
import { create } from "zustand";

// Dev bypass: active when Cognito env vars are missing or set to "placeholder"
const DEV_MODE =
  !import.meta.env.VITE_COGNITO_USER_POOL_ID ||
  import.meta.env.VITE_COGNITO_USER_POOL_ID === "placeholder";

const DEV_USER: AuthUser = {
  userId: "dev-user-001",
  email: "dev@koyta.local",
  role: "participant",
};

const DEV_ADMIN: AuthUser = {
  userId: "dev-admin-001",
  email: "admin@koyta.local",
  role: "admin",
};

export interface AuthUser {
  userId: string;
  email: string;
  role: "participant" | "admin";
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  needsPasswordChange: boolean;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  completePasswordChange: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  needsPasswordChange: false,

  hydrate: async () => {
    set({ isLoading: true });
    if (DEV_MODE) {
      const stored = sessionStorage.getItem("dev_user");
      set({ user: stored ? (JSON.parse(stored) as AuthUser) : null, isLoading: false });
      return;
    }
    try {
      const [cognitoUser, session] = await Promise.all([
        getCurrentUser(),
        fetchAuthSession(),
      ]);
      const idToken = session.tokens?.idToken;
      const payload = idToken?.payload;
      const role = (payload?.["custom:role"] as string) ?? "participant";
      set({
        user: {
          userId: cognitoUser.userId,
          email: cognitoUser.signInDetails?.loginId ?? "",
          role: role as "participant" | "admin",
        },
        isLoading: false,
      });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    if (DEV_MODE) {
      await new Promise((r) => setTimeout(r, 400)); // simulate network
      if (!email || !password) {
        set({ isLoading: false, error: "Enter any email and password." });
        return;
      }
      const user = email.includes("admin") ? DEV_ADMIN : DEV_USER;
      sessionStorage.setItem("dev_user", JSON.stringify(user));
      set({ user, isLoading: false });
      return;
    }
    try {
      const result = await signIn({ username: email, password });
      if (result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        set({ isLoading: false, needsPasswordChange: true });
        return;
      }
      await get().hydrate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      set({ isLoading: false, error: msg });
    }
  },

  completePasswordChange: async (newPassword) => {
    set({ isLoading: true, error: null });
    if (DEV_MODE) {
      set({ isLoading: false, needsPasswordChange: false });
      return;
    }
    try {
      await confirmSignIn({ challengeResponse: newPassword });
      set({ needsPasswordChange: false });
      await get().hydrate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Password change failed";
      set({ isLoading: false, error: msg });
    }
  },

  logout: async () => {
    if (DEV_MODE) {
      sessionStorage.removeItem("dev_user");
      set({ user: null, error: null });
      return;
    }
    await signOut();
    set({ user: null, error: null, needsPasswordChange: false });
  },

  clearError: () => set({ error: null }),
}));

export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

// Logout when the page becomes hidden — prevents session bleed on shared phones.
// Call once on app boot (main.tsx does this).
export function setupTabCloseLogout() {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void useAuth.getState().logout();
    }
  });
}
