import { router, type Href } from "expo-router";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { login as loginRequest, me, registerCustomer, registerSeller } from "@/src/domains/auth/services/auth-service";
import { AuthResponse, LoginRequest, RegisterCustomerRequest, RegisterSellerRequest, UserResponse } from "@/src/domains/auth/types/auth";
import { saveCatalog } from "@/src/domains/catalog/repositories/catalog-repository";
import { getMyCatalog } from "@/src/domains/catalog/services/catalog-service";
import { saveRemoteOrders } from "@/src/domains/order/repositories/order-repository";
import { getMyPurchases, getMySales } from "@/src/domains/order/services/order-service";
import { clearLocalWorkspace } from "@/src/shared/database/repositories/local-workspace-repository";
import { clearSession, getOrCreateDeviceId, getStoredSessionContext, getStoredUser, getToken, saveSessionContext, saveToken, saveUser, type StoredSessionContext } from "@/src/shared/lib/secure-storage";

type AuthContextValue = {
    user: UserResponse | null;
    token: string | null;
    loading: boolean;
    loadingMessage: string;
    isAuthenticated: boolean;
    login: (body: LoginRequest) => Promise<void>;
    signupSeller: (body: Omit<RegisterSellerRequest, "deviceId">) => Promise<void>;
    signupCustomer: (body: RegisterCustomerRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getHomeRoute(_user: UserResponse): Href {
    return "/(tabs)/home";
}

async function persistAuth(response: AuthResponse) {
    await saveToken(response.token);
    await saveUser(response.user);
}

function buildSessionContext(user: UserResponse): StoredSessionContext {
    return {
        userId: user.id,
        role: user.role,
        storeId: user.storeId ?? null,
    };
}

function hasContextChanged(previous: StoredSessionContext | null, current: StoredSessionContext) {
    if (!previous) {
        return false;
    }

    return previous.userId !== current.userId || previous.role !== current.role || (previous.storeId ?? null) !== (current.storeId ?? null);
}

function dedupeOrdersById<T extends { id: string }>(orders: T[]) {
    return Array.from(new Map(orders.map((order) => [order.id, order])).values());
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("Preparando seus dados");

    const prepareWorkspaceForUser = useCallback(async (nextUser: UserResponse) => {
        setLoadingMessage("Sincronizando informações");

        if (nextUser.role === "SELLER") {
            const [catalog, sales, purchases] = await Promise.all([getMyCatalog(), getMySales(), getMyPurchases()]);
            await saveCatalog(catalog);
            await saveRemoteOrders(dedupeOrdersById([...sales, ...purchases]));
            return;
        }

        const purchases = await getMyPurchases();
        await saveRemoteOrders(purchases);
    }, []);

    const syncSessionContext = useCallback(async (nextUser: UserResponse) => {
        const previousContext = await getStoredSessionContext();
        const currentContext = buildSessionContext(nextUser);

        if (hasContextChanged(previousContext, currentContext)) {
            await clearLocalWorkspace();
        }

        await saveSessionContext(currentContext);
        await prepareWorkspaceForUser(nextUser);
    }, [prepareWorkspaceForUser]);

    const bootstrap = useCallback(async () => {
        try {
            setLoadingMessage("Preparando seus dados");

            const storedToken = await getToken();
            const storedUser = await getStoredUser<UserResponse>();

            if (!storedToken || !storedUser) {
                setToken(null);
                setUser(null);
                return;
            }

            setToken(storedToken);
            setUser(storedUser);

            try {
                const freshUser = await me();

                setUser(freshUser);
                await saveUser(freshUser);
                await syncSessionContext(freshUser);
            } catch {
                // If the backend is unavailable, we keep the last valid local session.
            }
        } catch {
            await clearSession();
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
            setLoadingMessage("Preparando seus dados");
        }
    }, [syncSessionContext]);

    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    const login = useCallback(async (body: LoginRequest) => {
        setLoading(true);
        setLoadingMessage("Preparando seus dados");

        try {
            const response = await loginRequest(body);

            await persistAuth(response);
            await syncSessionContext(response.user);

            setToken(response.token);
            setUser(response.user);

            router.replace(getHomeRoute(response.user));
        } finally {
            setLoading(false);
            setLoadingMessage("Preparando seus dados");
        }
    }, [syncSessionContext]);

    const signupSeller = useCallback(async (body: Omit<RegisterSellerRequest, "deviceId">) => {
        setLoading(true);
        setLoadingMessage("Preparando seus dados");

        try {
            const deviceId = await getOrCreateDeviceId();

            const response = await registerSeller({
                ...body,
                deviceId,
            });

            await persistAuth(response);
            await syncSessionContext(response.user);

            setToken(response.token);
            setUser(response.user);

            router.replace(getHomeRoute(response.user));
        } finally {
            setLoading(false);
            setLoadingMessage("Preparando seus dados");
        }
    }, [syncSessionContext]);

    const signupCustomer = useCallback(async (body: RegisterCustomerRequest) => {
        setLoading(true);
        setLoadingMessage("Preparando seus dados");

        try {
            const response = await registerCustomer(body);

            await persistAuth(response);
            await syncSessionContext(response.user);

            setToken(response.token);
            setUser(response.user);

            router.replace(getHomeRoute(response.user));
        } finally {
            setLoading(false);
            setLoadingMessage("Preparando seus dados");
        }
    }, [syncSessionContext]);

    const refreshUser = useCallback(async () => {
        const freshUser = await me();

        setUser(freshUser);
        await saveUser(freshUser);
        await syncSessionContext(freshUser);
    }, [syncSessionContext]);

    const logout = useCallback(async () => {
        await clearSession();
        await clearLocalWorkspace();

        setToken(null);
        setUser(null);

        router.replace("/login");
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            token,
            loading,
            loadingMessage,
            isAuthenticated: !!token && !!user,
            login,
            signupSeller,
            signupCustomer,
            logout,
            refreshUser,
        }),
        [user, token, loading, loadingMessage, login, signupSeller, signupCustomer, logout, refreshUser],
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
