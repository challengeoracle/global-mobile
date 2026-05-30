import { router, type Href } from "expo-router";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { login as loginRequest, me, registerCustomer, registerSeller } from "@/src/domains/auth/services/auth-service";
import { AuthResponse, LoginRequest, RegisterCustomerRequest, RegisterSellerRequest, UserResponse } from "@/src/domains/auth/types/auth";
import { clearLocalWorkspace } from "@/src/shared/database/repositories/local-workspace-repository";
import { clearSession, getOrCreateDeviceId, getStoredUser, getToken, saveToken, saveUser } from "@/src/shared/lib/secure-storage";

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

            try {
                const freshUser = await me();

                setUser(freshUser);
                await saveUser(freshUser);
            } catch (err) {
                console.warn("Não foi possível atualizar o usuário online. Mantendo sessão local.", err);
            }
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

    async function logout() {
        await clearSession();
        await clearLocalWorkspace();

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
        }),
        [user, token, loading],
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
