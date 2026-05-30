import { getToken } from "./secure-storage";

const AUTH_API_URL = process.env.EXPO_PUBLIC_AUTH_API_URL;
const SALES_API_URL = process.env.EXPO_PUBLIC_SALES_API_URL;

if (!AUTH_API_URL) {
    console.warn("EXPO_PUBLIC_AUTH_API_URL não configurada.");
}

if (!SALES_API_URL) {
    console.warn("EXPO_PUBLIC_SALES_API_URL não configurada.");
}

type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    auth?: boolean;
};

async function request<T>(baseUrl: string | undefined, path: string, options: RequestOptions = {}): Promise<T> {
    if (!baseUrl) {
        throw new Error("URL da API não configurada.");
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (options.auth) {
        const token = await getToken();

        if (!token) {
            throw new Error("Usuário não autenticado.");
        }

        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();

    let data: any = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!response.ok) {
        const message = data?.message || data?.error || "Não foi possível concluir a operação.";

        throw new Error(message);
    }

    return data as T;
}

export function authRequest<T>(path: string, options: RequestOptions = {}) {
    return request<T>(AUTH_API_URL, path, options);
}

export function salesRequest<T>(path: string, options: RequestOptions = {}) {
    return request<T>(SALES_API_URL, path, options);
}
