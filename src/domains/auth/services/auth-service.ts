import { AuthResponse, DeviceStatusResponse, LoginRequest, RegisterCustomerRequest, RegisterSellerRequest, UserResponse } from "@/src/domains/auth/types/auth";
import { authRequest } from "@/src/shared/lib/api";

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
