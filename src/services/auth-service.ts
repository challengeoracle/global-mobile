import { apiRequest } from "../lib/api";
import { AuthResponse, CustomerOfflineActivationResponse, CustomerOfflineStatusResponse, DeviceStatusResponse, LoginRequest, OfflineActivationResponse, RegisterCustomerRequest, RegisterSellerRequest, UserResponse } from "../types/auth";

export function login(body: LoginRequest) {
    return apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body,
    });
}

export function registerSeller(body: RegisterSellerRequest) {
    return apiRequest<AuthResponse>("/auth/register/seller", {
        method: "POST",
        body,
    });
}

export function registerCustomer(body: RegisterCustomerRequest) {
    return apiRequest<AuthResponse>("/auth/register/customer", {
        method: "POST",
        body,
    });
}

export function me() {
    return apiRequest<UserResponse>("/auth/me", {
        auth: true,
    });
}

export function getSellerDevice() {
    return apiRequest<DeviceStatusResponse>("/device/me", {
        auth: true,
    });
}

export function activateSellerOffline() {
    return apiRequest<OfflineActivationResponse>("/device/offline/activate", {
        method: "POST",
        auth: true,
    });
}

export function activateCustomerOffline() {
    return apiRequest<CustomerOfflineActivationResponse>("/customer/offline/activate", {
        method: "POST",
        auth: true,
    });
}

export function getCustomerOfflineStatus() {
    return apiRequest<CustomerOfflineStatusResponse>("/customer/offline/me", {
        auth: true,
    });
}

export function updateSellerDevice(deviceId: string) {
    return apiRequest<DeviceStatusResponse>("/device/me", {
        method: "PATCH",
        auth: true,
        body: {
            deviceId,
        },
    });
}
