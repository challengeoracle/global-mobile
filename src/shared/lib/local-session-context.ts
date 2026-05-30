import { getStoredSessionContext } from "@/src/shared/lib/secure-storage";

export type LocalSessionContext = {
    userId: string;
    role: string;
    storeId: string | null;
};

export async function getLocalSessionContext(): Promise<LocalSessionContext | null> {
    const context = await getStoredSessionContext();

    if (!context?.userId) {
        return null;
    }

    return {
        userId: context.userId,
        role: context.role,
        storeId: context.storeId ?? null,
    };
}
