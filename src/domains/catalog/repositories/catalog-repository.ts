import { CatalogCategory, CatalogProduct, CatalogQrPayload, CatalogResponse, CategoryResponse } from "@/src/domains/catalog/types/catalog";
import { randomUUID } from "expo-crypto";
import { db } from "@/src/shared/database/database";
import { getLocalSessionContext } from "@/src/shared/lib/local-session-context";

type LocalCategoryRow = {
    id: string;
    name: string;
    description: string | null;
    active: number;
    created_at: string | null;
};

type LocalProductRow = {
    id: string;
    category_id: string;
    store_id: string;
    name: string;
    description: string | null;
    price: number;
    stock_quantity: number;
    active: number;
    created_at: string | null;
    updated_at: string | null;
};

type TableInfoRow = {
    name: string;
};

type CatalogSyncQueuePayloadRow = {
    id: string;
    payload_json: string;
    last_error?: string | null;
};

type QueuePayloadWithItems = {
    localOrderId?: string;
    items?: {
        productId?: string;
    }[];
};

function isProductNotFoundMessage(message?: string | null) {
    if (!message) {
        return false;
    }

    return message.toLowerCase().includes("product not found");
}

function toBoolean(value: number) {
    return value === 1;
}

function toCatalogProduct(row: LocalProductRow): CatalogProduct {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        stockQuantity: row.stock_quantity,
        active: toBoolean(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function stripLegacyPrefix(value: string | undefined | null, prefix: string) {
    if (!value?.startsWith(prefix)) {
        return value;
    }

    return value.slice(prefix.length);
}

export async function clearCatalog() {
    const context = await getLocalSessionContext();

    if (!context) {
        return;
    }

    await db.runAsync(`DELETE FROM products WHERE owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?)`, [context.userId, context.storeId, context.storeId]);
    await db.runAsync(`DELETE FROM categories WHERE owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?)`, [context.userId, context.storeId, context.storeId]);
}

export async function saveCatalog(catalog: CatalogResponse) {
    const context = await getLocalSessionContext();

    if (!context) {
        return;
    }

    await clearCatalog();

    for (const category of catalog.categories) {
        await db.runAsync(
            `
            INSERT OR REPLACE INTO categories (
                id,
                name,
                description,
                active,
                created_at,
                owner_user_id,
                owner_store_id,
                owner_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [category.id, category.name, category.description ?? null, category.active ? 1 : 0, category.createdAt ?? null, context.userId, context.storeId, context.role],
        );

        for (const product of category.products) {
            await db.runAsync(
                `
                INSERT OR REPLACE INTO products (
                    id,
                    category_id,
                    store_id,
                    name,
                    description,
                    price,
                    stock_quantity,
                    active,
                    created_at,
                    updated_at,
                    owner_user_id,
                    owner_store_id,
                    owner_role
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [product.id, category.id, catalog.storeId, product.name, product.description ?? null, product.price, product.stockQuantity, product.active ? 1 : 0, product.createdAt ?? null, product.updatedAt ?? null, context.userId, context.storeId, context.role],
            );
        }
    }
}

export async function getCategories() {
    const context = await getLocalSessionContext();

    if (!context) {
        return [];
    }

    const rows = await db.getAllAsync<LocalCategoryRow>(`
        SELECT
            id,
            name,
            description,
            active,
            created_at
        FROM categories
        WHERE active = 1
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        ORDER BY name ASC
    `, [context.userId, context.storeId, context.storeId]);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        active: toBoolean(row.active),
        createdAt: row.created_at,
        products: [],
    })) satisfies CatalogCategory[];
}

export async function getProducts() {
    const context = await getLocalSessionContext();

    if (!context) {
        return [];
    }

    const rows = await db.getAllAsync<LocalProductRow>(`
        SELECT
            id,
            category_id,
            store_id,
            name,
            description,
            price,
            stock_quantity,
            active,
            created_at,
            updated_at
        FROM products
        WHERE active = 1
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        ORDER BY name ASC
    `, [context.userId, context.storeId, context.storeId]);

    return rows.map(toCatalogProduct);
}

export async function getProductsByCategory(categoryId: string) {
    const context = await getLocalSessionContext();

    if (!context) {
        return [];
    }

    const rows = await db.getAllAsync<LocalProductRow>(
        `
        SELECT
            id,
            category_id,
            store_id,
            name,
            description,
            price,
            stock_quantity,
            active,
            created_at,
            updated_at
        FROM products
        WHERE active = 1
          AND category_id = ?
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        ORDER BY name ASC
        `,
        [categoryId, context.userId, context.storeId, context.storeId],
    );

    return rows.map(toCatalogProduct);
}

export async function getProductById(productId: string) {
    const context = await getLocalSessionContext();

    if (!context) {
        return null;
    }

    const row = await db.getFirstAsync<LocalProductRow>(
        `
        SELECT
            id,
            category_id,
            store_id,
            name,
            description,
            price,
            stock_quantity,
            active,
            created_at,
            updated_at
        FROM products
        WHERE id = ?
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        LIMIT 1
        `,
        [productId, context.userId, context.storeId, context.storeId],
    );

    return row ? toCatalogProduct(row) : null;
}

export async function getCatalogFromLocal() {
    const categories = await getCategories();

    const categoriesWithProducts = await Promise.all(
        categories.map(async (category) => ({
            ...category,
            products: await getProductsByCategory(category.id),
        })),
    );

    return categoriesWithProducts;
}

export async function getCatalogStoreIdFromLocal() {
    const context = await getLocalSessionContext();

    if (!context) {
        return null;
    }

    const row = await db.getFirstAsync<{ store_id: string }>(
        `
        SELECT store_id
        FROM products
        WHERE store_id IS NOT NULL
          AND (owner_user_id = ? OR (? IS NOT NULL AND owner_store_id = ?))
        LIMIT 1
        `,
        [context.userId, context.storeId, context.storeId],
    );

    return row?.store_id ?? null;
}

export async function decreaseLocalProductStock(productId: string, quantity: number) {
    const product = await getProductById(productId);

    if (!product) {
        throw new Error("Produto não encontrado no catálogo local.");
    }

    if (product.stockQuantity < quantity) {
        throw new Error("Estoque local insuficiente.");
    }

    await db.runAsync(
        `
        UPDATE products
        SET stock_quantity = stock_quantity - ?,
            updated_at = ?
        WHERE id = ?
        `,
        [quantity, new Date().toISOString(), productId],
    );
}

export async function upsertLocalProduct(params: { id: string; categoryId: string; storeId: string; name: string; description?: string | null; price: number; stockQuantity: number; active?: boolean; createdAt?: string | null; updatedAt?: string | null }) {
    const context = await getLocalSessionContext();

    await db.runAsync(
        `
        INSERT OR REPLACE INTO products (
            id,
            category_id,
            store_id,
            name,
            description,
            price,
            stock_quantity,
            active,
            created_at,
            updated_at,
            owner_user_id,
            owner_store_id,
            owner_role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [params.id, params.categoryId, params.storeId, params.name, params.description ?? null, params.price, params.stockQuantity, params.active === false ? 0 : 1, params.createdAt ?? new Date().toISOString(), params.updatedAt ?? new Date().toISOString(), context?.userId ?? null, context?.storeId ?? null, context?.role ?? null],
    );
}

export async function increaseLocalProductStock(productId: string, quantity: number) {
    const product = await getProductById(productId);

    if (!product) {
        return;
    }

    await db.runAsync(
        `
        UPDATE products
        SET stock_quantity = stock_quantity + ?,
            updated_at = ?
        WHERE id = ?
        `,
        [quantity, new Date().toISOString(), productId],
    );
}

export async function createLocalProduct(params: { categoryId: string; storeId: string; name: string; description?: string | null; price: number; stockQuantity: number }) {
    const productId = randomUUID();
    const now = new Date().toISOString();
    const context = await getLocalSessionContext();

    await db.runAsync(
        `
        INSERT INTO products (
            id,
            category_id,
            store_id,
            name,
            description,
            price,
            stock_quantity,
            active,
            created_at,
            updated_at,
            owner_user_id,
            owner_store_id,
            owner_role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [productId, params.categoryId, params.storeId, params.name, params.description ?? null, params.price, params.stockQuantity, 1, now, now, context?.userId ?? null, context?.storeId ?? null, context?.role ?? null],
    );

    return productId;
}

export async function updateLocalProduct(params: { productId: string; categoryId?: string; name: string; description?: string | null; price: number; stockQuantity: number }) {
    await db.runAsync(
        `
        UPDATE products
        SET category_id = COALESCE(?, category_id),
            name = ?,
            description = ?,
            price = ?,
            stock_quantity = ?,
            updated_at = ?
        WHERE id = ?
        `,
        [params.categoryId ?? null, params.name, params.description ?? null, params.price, params.stockQuantity, new Date().toISOString(), params.productId],
    );
}

export async function deactivateLocalProduct(productId: string) {
    await db.runAsync(
        `
        UPDATE products
        SET active = 0,
            updated_at = ?
        WHERE id = ?
        `,
        [new Date().toISOString(), productId],
    );
}

export async function adjustLocalProductStock(productId: string, quantityDelta: number) {
    const product = await getProductById(productId);

    if (!product) {
        throw new Error("Produto não encontrado no catálogo local.");
    }

    const newStock = product.stockQuantity + quantityDelta;

    if (newStock < 0) {
        throw new Error("Estoque local não pode ficar negativo.");
    }

    await db.runAsync(
        `
        UPDATE products
        SET stock_quantity = ?,
            updated_at = ?
        WHERE id = ?
        `,
        [newStock, new Date().toISOString(), productId],
    );

    return newStock;
}

export async function saveCatalogFromQr(payload: CatalogQrPayload) {
    const context = await getLocalSessionContext();

    if (!context) {
        return payload.storeId;
    }

    await clearCatalog();

    for (const category of payload.categories) {
        await db.runAsync(
            `
            INSERT OR REPLACE INTO categories (
                id,
                name,
                description,
                active,
                created_at,
                owner_user_id,
                owner_store_id,
                owner_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [category.id, category.name, category.description ?? null, 1, payload.generatedAt, context.userId, context.storeId, context.role],
        );

        for (const product of category.products) {
            await db.runAsync(
                `
                INSERT OR REPLACE INTO products (
                    id,
                    category_id,
                    store_id,
                    name,
                    description,
                    price,
                    stock_quantity,
                    active,
                    created_at,
                    updated_at,
                    owner_user_id,
                    owner_store_id,
                    owner_role
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [product.id, category.id, payload.storeId, product.name, product.description ?? null, product.price, product.stockQuantity, 1, payload.generatedAt, payload.generatedAt, context.userId, context.storeId, context.role],
            );
        }
    }

    return payload.storeId;
}

export async function saveCategories(categories: CategoryResponse[]) {
    const context = await getLocalSessionContext();

    for (const category of categories) {
        await db.runAsync(
            `
            INSERT OR REPLACE INTO categories (
                id,
                name,
                description,
                active,
                created_at,
                owner_user_id,
                owner_store_id,
                owner_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [category.id, category.name, category.description ?? null, category.active ? 1 : 0, category.createdAt ?? null, context?.userId ?? null, context?.storeId ?? null, context?.role ?? null],
        );
    }
}

export async function upsertLocalCategory(params: { id: string; name: string; description?: string | null; active?: boolean; createdAt?: string | null }) {
    const context = await getLocalSessionContext();

    await db.runAsync(
        `
        INSERT OR REPLACE INTO categories (
            id,
            name,
            description,
            active,
            created_at,
            owner_user_id,
            owner_store_id,
            owner_role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [params.id, params.name, params.description ?? null, params.active === false ? 0 : 1, params.createdAt ?? new Date().toISOString(), context?.userId ?? null, context?.storeId ?? null, context?.role ?? null],
    );
}

export async function createLocalCategory(params: { name: string; description?: string | null }) {
    const categoryId = randomUUID();
    const now = new Date().toISOString();
    const context = await getLocalSessionContext();

    await db.runAsync(
        `
        INSERT INTO categories (
            id,
            name,
            description,
            active,
            created_at,
            owner_user_id,
            owner_store_id,
            owner_role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [categoryId, params.name, params.description ?? null, 1, now, context?.userId ?? null, context?.storeId ?? null, context?.role ?? null],
    );

    return categoryId;
}

export async function updateLocalCategory(params: { categoryId: string; name: string; description?: string | null }) {
    await db.runAsync(
        `
        UPDATE categories
        SET name = ?,
            description = ?
        WHERE id = ?
        `,
        [params.name, params.description ?? null, params.categoryId],
    );
}

export async function deactivateLocalCategory(categoryId: string) {
    await db.runAsync(
        `
        UPDATE categories
        SET active = 0
        WHERE id = ?
        `,
        [categoryId],
    );
}

export async function normalizeLegacyCatalogIds() {
    try {
        const columns = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(catalog_sync_queue)`);
        const columnNames = new Set(columns.map((column) => column.name));

        if (columnNames.has("category_id")) {
            await db.runAsync(`
                UPDATE catalog_sync_queue
                SET category_id = REPLACE(category_id, 'local-category-', '')
                WHERE category_id LIKE 'local-category-%'
            `);
        }

        if (columnNames.has("product_id")) {
            await db.runAsync(`
                UPDATE catalog_sync_queue
                SET product_id = REPLACE(product_id, 'local-product-', '')
                WHERE product_id LIKE 'local-product-%'
            `);
        }

        if (columnNames.has("payload_json")) {
            const rows = await db.getAllAsync<CatalogSyncQueuePayloadRow>(`
                SELECT id, payload_json
                FROM catalog_sync_queue
            `);

            for (const row of rows) {
                const payload = JSON.parse(row.payload_json) as {
                    categoryId?: string;
                    productId?: string;
                };
                const categoryId = stripLegacyPrefix(payload.categoryId, "local-category-");
                const productId = stripLegacyPrefix(payload.productId, "local-product-");

                if (categoryId === payload.categoryId && productId === payload.productId) {
                    continue;
                }

                await db.runAsync(
                    `
                    UPDATE catalog_sync_queue
                    SET payload_json = ?
                    WHERE id = ?
                    `,
                    [JSON.stringify({ ...payload, categoryId, productId }), row.id],
                );
            }
        }
    } catch {
        // Legacy queue normalization is best-effort and should not block the catalog.
    }
}

export async function reconcileProductIdReference(localProductId: string, remoteProductId: string) {
    if (!localProductId || !remoteProductId || localProductId === remoteProductId) {
        return;
    }

    await db.withTransactionAsync(async () => {
        const orderIdsToRequeue = new Set<string>();

        await db.runAsync(
            `
            UPDATE products
            SET id = ?
            WHERE id = ?
            `,
            [remoteProductId, localProductId],
        );

        await db.runAsync(
            `
            UPDATE order_items
            SET product_id = ?
            WHERE product_id = ?
            `,
            [remoteProductId, localProductId],
        );

        const catalogQueueRows = await db.getAllAsync<CatalogSyncQueuePayloadRow>(
            `
            SELECT id, payload_json
            FROM catalog_sync_queue
            WHERE payload_json LIKE ?
            `,
            [`%${localProductId}%`],
        );

        for (const row of catalogQueueRows) {
            const payload = JSON.parse(row.payload_json) as { productId?: string };

            if (payload.productId !== localProductId) {
                continue;
            }

            await db.runAsync(
                `
                UPDATE catalog_sync_queue
                SET payload_json = ?
                WHERE id = ?
                `,
                [JSON.stringify({ ...payload, productId: remoteProductId }), row.id],
            );
        }

        const orderQueueRows = await db.getAllAsync<CatalogSyncQueuePayloadRow>(
            `
            SELECT id, payload_json, last_error
            FROM order_sync_queue
            WHERE payload_json LIKE ?
            `,
            [`%${localProductId}%`],
        );

        for (const row of orderQueueRows) {
            const payload = JSON.parse(row.payload_json) as QueuePayloadWithItems;

            if (!payload.items?.some((item) => item.productId === localProductId)) {
                continue;
            }

            if (payload.localOrderId && isProductNotFoundMessage(row.last_error)) {
                orderIdsToRequeue.add(payload.localOrderId);
            }

            await db.runAsync(
                `
                UPDATE order_sync_queue
                SET payload_json = ?
                WHERE id = ?
                `,
                [
                    JSON.stringify({
                        ...payload,
                        items: payload.items.map((item) => ({
                            ...item,
                            productId: item.productId === localProductId ? remoteProductId : item.productId,
                        })),
                    }),
                    row.id,
                ],
            );
        }

        if (orderIdsToRequeue.size > 0) {
            const placeholders = Array.from(orderIdsToRequeue).map(() => "?").join(", ");
            const timestamp = new Date().toISOString();
            const params = Array.from(orderIdsToRequeue);

            await db.runAsync(
                `
                UPDATE order_sync_queue
                SET status = 'PENDING',
                    attempts = 0,
                    last_error = NULL,
                    next_retry_at = NULL,
                    synced_at = NULL,
                    updated_at = ?
                WHERE operation_id IN (${placeholders})
                  AND status = 'REJECTED'
                `,
                [timestamp, ...params],
            );

            await db.runAsync(
                `
                UPDATE orders
                SET sync_status = 'PENDING',
                    updated_at = ?,
                    server_synced_at = NULL,
                    synced_at = NULL
                WHERE local_order_id IN (${placeholders})
                  AND sync_status = 'REJECTED'
                `,
                [timestamp, ...params],
            );
        }
    });
}
