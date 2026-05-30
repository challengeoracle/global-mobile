export type UserRole = "SELLER" | "CUSTOMER";

export type UserResponse = {
    id: string;
    name: string;
    email: string;
    cpf: string;
    phone: string;
    role: UserRole;
    storeName: string | null;
    deviceId: string | null;
    storeId?: string | null;
};

export type AuthResponse = {
    token: string;
    user: UserResponse;
};

export type LoginRequest = {
    email: string;
    password: string;
};

export type RegisterSellerRequest = {
    name: string;
    email: string;
    password: string;
    cpf: string;
    phone: string;
    storeName: string;
    storeCategory: string;
    deviceId: string;
};

export type RegisterCustomerRequest = {
    name: string;
    email: string;
    password: string;
    cpf: string;
    phone: string;
};

export type DeviceStatusResponse = {
    deviceId: string;
    active: boolean;
    offlineEnabled?: boolean;
    expired?: boolean;
    offlineExpiresAt?: string | null;
};
