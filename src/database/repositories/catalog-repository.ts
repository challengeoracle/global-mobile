import { CatalogCategory, CatalogProduct, CatalogQrPayload, CatalogResponse } from "@/src/types/sales";
import { randomUUID } from "expo-crypto";
import { db } from "../database";

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

export async function clearCatalog() {
    await db.execAsync(`
        DELETE FROM products;
        DELETE FROM categories;
    `);
}

export async function saveCatalog(catalog: CatalogResponse) {
    await db.withTransactionAsync(async () => {
        await clearCatalog();

        for (const category of catalog.categories) {
            await db.runAsync(
                `
                    INSERT OR REPLACE INTO categories (
                        id,
                        name,
                        description,
                        active,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?)
                `,
                [category.id, category.name, category.description ?? null, category.active ? 1 : 0, category.createdAt ?? null],
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
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [product.id, category.id, catalog.storeId, product.name, product.description ?? null, product.price, product.stockQuantity, product.active ? 1 : 0, product.createdAt ?? null, product.updatedAt ?? null],
                );
            }
        }
    });
}

export async function getCategories() {
    const rows = await db.getAllAsync<LocalCategoryRow>(`
        SELECT
            id,
            name,
            description,
            active,
            created_at
        FROM categories
        WHERE active = 1
        ORDER BY name ASC
    `);

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
        ORDER BY name ASC
    `);

    return rows.map(toCatalogProduct);
}

export async function getProductsByCategory(categoryId: string) {
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
            ORDER BY name ASC
        `,
        [categoryId],
    );

    return rows.map(toCatalogProduct);
}

export async function getProductById(productId: string) {
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
            LIMIT 1
        `,
        [productId],
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
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [params.id, params.categoryId, params.storeId, params.name, params.description ?? null, params.price, params.stockQuantity, params.active === false ? 0 : 1, params.createdAt ?? new Date().toISOString(), params.updatedAt ?? new Date().toISOString()],
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

export async function createLocalProduct(params: { categoryId: string; storeId: string; name: string; description?: string | null; price: number; stockQuantity: number }) {
    const productId = `local-product-${randomUUID()}`;
    const now = new Date().toISOString();

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
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [productId, params.categoryId, params.storeId, params.name, params.description ?? null, params.price, params.stockQuantity, 1, now, now],
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
    await db.withTransactionAsync(async () => {
        await clearCatalog();

        for (const category of payload.categories) {
            await db.runAsync(
                `
                    INSERT OR REPLACE INTO categories (
                        id,
                        name,
                        description,
                        active,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?)
                `,
                [category.id, category.name, category.description ?? null, 1, payload.generatedAt],
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
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [product.id, category.id, payload.storeId, product.name, product.description ?? null, product.price, product.stockQuantity, 1, payload.generatedAt, payload.generatedAt],
                );
            }
        }
    });

    return payload.storeId;
}
