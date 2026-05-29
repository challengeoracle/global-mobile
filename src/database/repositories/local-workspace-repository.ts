import { db } from "../database";

export async function clearLocalWorkspace() {
    await db.withTransactionAsync(async () => {
        // Filas de sincronização
        await db.runAsync("DELETE FROM catalog_sync_queue");
        await db.runAsync("DELETE FROM order_sync_queue");

        // Pedidos locais
        await db.runAsync("DELETE FROM order_items");
        await db.runAsync("DELETE FROM orders");

        // Catálogo local
        await db.runAsync("DELETE FROM products");
        await db.runAsync("DELETE FROM categories");
    });
}
