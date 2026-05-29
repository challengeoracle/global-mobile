import { authRequest } from "../lib/api";
import { AuthResponse, DeviceStatusResponse, LoginRequest, RegisterCustomerRequest, RegisterSellerRequest, UserResponse } from "../types/auth";

export function login(body: LoginRequest) {
    return authRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body,
    });
}

export function registerSeller(body: RegisterSellerRequest) {
    return authRequest<AuthResponse>("/auth/register/seller", {
        method: "POST",
        body,
    });
}

export function registerCustomer(body: RegisterCustomerRequest) {
    return authRequest<AuthResponse>("/auth/register/customer", {
        method: "POST",
        body,
    });
}

export function me() {
    return authRequest<UserResponse>("/auth/me", {
        auth: true,
    });
}

export function updateSellerDevice(deviceId: string) {
    return authRequest<DeviceStatusResponse>("/device/me", {
        method: "PATCH",
        auth: true,
        body: {
            deviceId,
        },
    });
}
