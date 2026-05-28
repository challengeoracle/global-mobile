import { router, type Href } from "expo-router";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { clearSession, getOrCreateDeviceId, getStoredUser, getToken, saveCustomerOfflineSession, saveSellerOfflineSession, saveToken, saveUser } from "../lib/secure-storage";

import { activateCustomerOffline, activateSellerOffline, login as loginRequest, me, registerCustomer, registerSeller } from "../services/auth-service";

import { AuthResponse, LoginRequest, RegisterCustomerRequest, RegisterSellerRequest, UserResponse } from "../types/auth";

type AuthContextValue = {
    user: UserResponse | null;
    token: string | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (body: LoginRequest) => Promise<void>;
    signupSeller: (body: Omit<RegisterSellerRequest, "deviceId">) => Promise<void>;
    signupCustomer: (body: RegisterCustomerRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    activateOffline: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getHomeRoute(user: UserResponse): Href {
    if (user.role === "SELLER") {
        return "/(tabs)/home";
    }

    return "/(tabs)/home";
}

async function persistAuth(response: AuthResponse) {
    await saveToken(response.token);
    await saveUser(response.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    async function bootstrap() {
        try {
            const storedToken = await getToken();
            const storedUser = await getStoredUser<UserResponse>();

            if (!storedToken || !storedUser) {
                setToken(null);
                setUser(null);
                return;
            }

            setToken(storedToken);
            setUser(storedUser);

            const freshUser = await me();

            setUser(freshUser);
            await saveUser(freshUser);
        } catch {
            await clearSession();
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        bootstrap();
    }, []);

    async function login(body: LoginRequest) {
        const response = await loginRequest(body);

        await persistAuth(response);

        setToken(response.token);
        setUser(response.user);

        router.replace(getHomeRoute(response.user));
    }

    async function signupSeller(body: Omit<RegisterSellerRequest, "deviceId">) {
        const deviceId = await getOrCreateDeviceId();

        const response = await registerSeller({
            ...body,
            deviceId,
        });

        await persistAuth(response);

        setToken(response.token);
        setUser(response.user);

        router.replace(getHomeRoute(response.user));
    }

    async function signupCustomer(body: RegisterCustomerRequest) {
        const response = await registerCustomer(body);

        await persistAuth(response);

        setToken(response.token);
        setUser(response.user);

        router.replace(getHomeRoute(response.user));
    }

    async function refreshUser() {
        const freshUser = await me();

        setUser(freshUser);
        await saveUser(freshUser);
    }

    const activateOffline = useCallback(async () => {
        if (!user) {
            throw new Error("Usuário não autenticado.");
        }

        if (user.role === "SELLER") {
            const response = await activateSellerOffline();

            await saveSellerOfflineSession(response.offlineToken, response.offlineExpiresAt);

            return;
        }

        const response = await activateCustomerOffline();

        await saveCustomerOfflineSession(response.sessionToken, response.expiresAt);
    }, [user]);

    async function logout() {
        await clearSession();

        setToken(null);
        setUser(null);

        router.replace("/login");
    }

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            token,
            loading,
            isAuthenticated: !!token && !!user,
            login,
            signupSeller,
            signupCustomer,
            logout,
            refreshUser,
            activateOffline,
        }),
        [user, token, loading, activateOffline],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth deve ser usado dentro de AuthProvider.");
    }

    return context;
}
