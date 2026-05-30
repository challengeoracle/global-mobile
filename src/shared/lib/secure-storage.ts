import * as SecureStore from "expo-secure-store";

const KEYS = {
    token: "signal.jwt",
    user: "signal.user",
    deviceId: "signal.device_id",
    sessionContext: "signal.session_context",
};

export type StoredSessionContext = {
    userId: string;
    role: string;
    storeId: string | null;
};

export async function saveToken(token: string) {
    await SecureStore.setItemAsync(KEYS.token, token);
}

export async function getToken() {
    return SecureStore.getItemAsync(KEYS.token);
}

export async function saveUser(user: unknown) {
    await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
}

export async function getStoredUser<T>() {
    const raw = await SecureStore.getItemAsync(KEYS.user);
    return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveSessionContext(context: StoredSessionContext) {
    await SecureStore.setItemAsync(KEYS.sessionContext, JSON.stringify(context));
}

export async function getStoredSessionContext() {
    const raw = await SecureStore.getItemAsync(KEYS.sessionContext);
    return raw ? (JSON.parse(raw) as StoredSessionContext) : null;
}

export async function getOrCreateDeviceId() {
    const stored = await SecureStore.getItemAsync(KEYS.deviceId);

    if (stored) {
        return stored;
    }

    const generated = `signal-device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await SecureStore.setItemAsync(KEYS.deviceId, generated);

    return generated;
}

export async function clearSession() {
    await Promise.all([SecureStore.deleteItemAsync(KEYS.token), SecureStore.deleteItemAsync(KEYS.user), SecureStore.deleteItemAsync(KEYS.sessionContext)]);
}

export async function regenerateDeviceId() {
    const generated = `offpay-device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await SecureStore.setItemAsync(KEYS.deviceId, generated);

    return generated;
}
