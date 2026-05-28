import { getToken } from "./secure-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
    console.warn("EXPO_PUBLIC_API_URL não configurada.");
}

type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (options.auth) {
        const token = await getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_URL}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
        const message = data?.message || data?.error || "Não foi possível concluir a operação.";

        throw new Error(message);
    }

    return data as T;
}
