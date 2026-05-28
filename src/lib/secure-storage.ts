import * as SecureStore from "expo-secure-store";

const KEYS = {
    token: "signal.jwt",
    user: "signal.user",
    deviceId: "signal.device_id",
    sellerOfflineToken: "signal.seller_offline_token",
    sellerOfflineExpiresAt: "signal.seller_offline_expires_at",
    customerOfflineToken: "signal.customer_offline_token",
    customerOfflineExpiresAt: "signal.customer_offline_expires_at",
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

export async function saveSellerOfflineSession(token: string, expiresAt: string) {
    await SecureStore.setItemAsync(KEYS.sellerOfflineToken, token);
    await SecureStore.setItemAsync(KEYS.sellerOfflineExpiresAt, expiresAt);
}

export async function saveCustomerOfflineSession(token: string, expiresAt: string) {
    await SecureStore.setItemAsync(KEYS.customerOfflineToken, token);
    await SecureStore.setItemAsync(KEYS.customerOfflineExpiresAt, expiresAt);
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
    await Promise.all([SecureStore.deleteItemAsync(KEYS.token), SecureStore.deleteItemAsync(KEYS.user), SecureStore.deleteItemAsync(KEYS.sellerOfflineToken), SecureStore.deleteItemAsync(KEYS.sellerOfflineExpiresAt), SecureStore.deleteItemAsync(KEYS.customerOfflineToken), SecureStore.deleteItemAsync(KEYS.customerOfflineExpiresAt)]);
}
