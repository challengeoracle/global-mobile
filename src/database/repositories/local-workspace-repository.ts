import { db } from "../database";

export async function clearLocalWorkspace() {
    await db.execAsync(`
        DELETE FROM catalog_sync_queue;
        DELETE FROM order_sync_queue;

        DELETE FROM order_items;
        DELETE FROM orders;

        DELETE FROM products;
        DELETE FROM categories;
    `);
}
