/**
 * Inventory Concurrency Guard
 *
 * Provides optimistic locking, reserved quantity management, and stock
 * validation guards to prevent overselling when products are sold locally
 * (LocalSale) and simultaneously ordered through Pi escrow (Invoice).
 *
 * All stock operations use db.$transaction for atomicity and version checks
 * for optimistic locking.
 */

import { db } from "@/lib/db";
import { roundPi } from "@/lib/pi-amount";

// ─── Types ─────────────────────────────────────────────────────────────

/** Per-item stock availability breakdown */
interface StockItemInfo {
  productId: string;
  productName: string;
  requested: number;
  available: number;   // quantity - reservedQuantity
  inStock: number;     // total quantity
  reserved: number;    // reservedQuantity
  sufficient: boolean;
}

/** Result of stock availability check */
interface StockCheckResult {
  available: boolean;
  items: StockItemInfo[];
}

// ─── checkStockAvailability ────────────────────────────────────────────

/**
 * Check if items are available for sale.
 * Available = inventory.quantity - inventory.reservedQuantity
 * Returns per-item breakdown with overall availability flag.
 *
 * If no inventory record exists, the product has unlimited stock → sufficient: true
 * If trackInventory is false → sufficient: true
 */
export async function checkStockAvailability(
  storeId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<StockCheckResult> {
  const itemInfos: StockItemInfo[] = [];

  for (const item of items) {
    const inventory = await db.inventory.findUnique({
      where: { productId_storeId: { productId: item.productId, storeId } },
      include: { product: { select: { name: true, trackInventory: true } } },
    });

    // No inventory record → unlimited stock (product not tracked yet)
    if (!inventory) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { name: true, trackInventory: true },
      });
      itemInfos.push({
        productId: item.productId,
        productName: product?.name || "Unknown",
        requested: item.quantity,
        available: Infinity,
        inStock: Infinity,
        reserved: 0,
        sufficient: true,
      });
      continue;
    }

    // Not tracking inventory → always sufficient
    if (!inventory.trackInventory) {
      itemInfos.push({
        productId: item.productId,
        productName: inventory.product.name,
        requested: item.quantity,
        available: inventory.quantity - inventory.reservedQuantity,
        inStock: inventory.quantity,
        reserved: inventory.reservedQuantity,
        sufficient: true,
      });
      continue;
    }

    const available = inventory.quantity - inventory.reservedQuantity;
    itemInfos.push({
      productId: item.productId,
      productName: inventory.product.name,
      requested: item.quantity,
      available,
      inStock: inventory.quantity,
      reserved: inventory.reservedQuantity,
      sufficient: available >= item.quantity,
    });
  }

  return {
    available: itemInfos.every((i) => i.sufficient),
    items: itemInfos,
  };
}

// ─── reserveStock ──────────────────────────────────────────────────────

/**
 * Reserve stock for escrow order.
 * Called when invoice status transitions to 'paid_escrow'.
 * Uses optimistic locking: reads version, updates with version+1 check.
 * Returns true if successful, false with conflicts if version mismatch or insufficient stock.
 */
export async function reserveStock(
  storeId: string,
  items: Array<{ productId: string; quantity: number }>,
  invoiceId: string,
  createdBy: string
): Promise<{ success: boolean; conflicts?: string[] }> {
  try {
    const result = await db.$transaction(async (tx) => {
      const conflicts: string[] = [];

      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId_storeId: { productId: item.productId, storeId } },
        });

        if (!inventory) continue; // No inventory record → unlimited
        if (!inventory.trackInventory) continue; // Not tracked → skip

        const available = inventory.quantity - inventory.reservedQuantity;
        if (available < item.quantity) {
          conflicts.push(
            `${inventory.product ? "" : ""}Product ${item.productId}: available ${available}, requested ${item.quantity}`
          );
          continue;
        }

        // Optimistic lock: update only if version matches
        const updated = await tx.inventory.updateMany({
          where: {
            id: inventory.id,
            version: inventory.version,
          },
          data: {
            reservedQuantity: inventory.reservedQuantity + item.quantity,
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          conflicts.push(
            `Product ${item.productId}: concurrent modification detected (version mismatch)`
          );
          continue;
        }

        // Create InventoryMovement for reservation
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type: "out",
            quantity: -item.quantity,
            reason: `Reserved for escrow INV-${invoiceId.slice(-8)}`,
            referenceId: invoiceId,
            createdBy,
          },
        });
      }

      if (conflicts.length > 0) {
        throw new Error(`STOCK_CONFLICT:${JSON.stringify(conflicts)}`);
      }

      return true;
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("STOCK_CONFLICT:")) {
      const conflicts: string[] = JSON.parse(error.message.slice("STOCK_CONFLICT:".length));
      return { success: false, conflicts };
    }
    console.error("reserveStock error:", error);
    return { success: false, conflicts: ["Unexpected error during stock reservation"] };
  }
}

// ─── releaseReservedStock ──────────────────────────────────────────────

/**
 * Release reserved stock.
 * Called when invoice is cancelled or disputed (return items to available).
 * Uses optimistic locking with version check.
 */
export async function releaseReservedStock(
  storeId: string,
  items: Array<{ productId: string; quantity: number }>,
  invoiceId: string,
  createdBy: string
): Promise<boolean> {
  try {
    await db.$transaction(async (tx) => {
      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId_storeId: { productId: item.productId, storeId } },
        });

        if (!inventory) continue;
        if (!inventory.trackInventory) continue;

        const newReserved = Math.max(0, inventory.reservedQuantity - item.quantity);

        // Optimistic lock update
        const updated = await tx.inventory.updateMany({
          where: {
            id: inventory.id,
            version: inventory.version,
          },
          data: {
            reservedQuantity: newReserved,
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          // Version mismatch — retry once by reading fresh version
          const fresh = await tx.inventory.findUnique({ where: { id: inventory.id } });
          if (fresh) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                reservedQuantity: Math.max(0, fresh.reservedQuantity - item.quantity),
                version: { increment: 1 },
              },
            });
          }
          continue;
        }

        // Create InventoryMovement for release
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type: "adjustment",
            quantity: item.quantity,
            reason: `Escrow cancelled INV-${invoiceId.slice(-8)}`,
            referenceId: invoiceId,
            createdBy,
          },
        });
      }
    });

    return true;
  } catch (error) {
    console.error("releaseReservedStock error:", error);
    return false;
  }
}

// ─── deductStock ───────────────────────────────────────────────────────

/**
 * Deduct stock after sale completion.
 * Called when local sale is created OR escrow invoice reaches 'completed'.
 *
 * For local sales: deducts from quantity directly (no reservation).
 * For escrow: deducts from quantity AND reduces reservedQuantity.
 *
 * Uses optimistic locking.
 */
export async function deductStock(
  storeId: string,
  items: Array<{ productId: string; quantity: number }>,
  referenceId: string,
  createdBy: string,
  isEscrow: boolean
): Promise<{ success: boolean; conflicts?: string[] }> {
  try {
    const result = await db.$transaction(async (tx) => {
      const conflicts: string[] = [];

      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId_storeId: { productId: item.productId, storeId } },
        });

        if (!inventory) continue; // No inventory → unlimited
        if (!inventory.trackInventory) continue; // Not tracked → skip

        if (isEscrow) {
          // Escrow: deduct from quantity AND reduce reservedQuantity
          const newQuantity = inventory.quantity - item.quantity;
          const newReserved = Math.max(0, inventory.reservedQuantity - item.quantity);

          const updated = await tx.inventory.updateMany({
            where: { id: inventory.id, version: inventory.version },
            data: {
              quantity: newQuantity,
              reservedQuantity: newReserved,
              version: { increment: 1 },
            },
          });

          if (updated.count === 0) {
            // Retry with fresh version
            const fresh = await tx.inventory.findUnique({ where: { id: inventory.id } });
            if (fresh) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity: fresh.quantity - item.quantity,
                  reservedQuantity: Math.max(0, fresh.reservedQuantity - item.quantity),
                  version: { increment: 1 },
                },
              });
            }
          }
        } else {
          // Local sale: check available first, then deduct from quantity
          const available = inventory.quantity - inventory.reservedQuantity;
          if (available < item.quantity) {
            conflicts.push(
              `Product ${item.productId}: available ${available}, requested ${item.quantity}`
            );
            continue;
          }

          const newQuantity = inventory.quantity - item.quantity;

          const updated = await tx.inventory.updateMany({
            where: { id: inventory.id, version: inventory.version },
            data: {
              quantity: newQuantity,
              version: { increment: 1 },
            },
          });

          if (updated.count === 0) {
            // Version mismatch — retry with fresh version
            const fresh = await tx.inventory.findUnique({ where: { id: inventory.id } });
            if (fresh) {
              const freshAvailable = fresh.quantity - fresh.reservedQuantity;
              if (freshAvailable < item.quantity) {
                conflicts.push(
                  `Product ${item.productId}: available ${freshAvailable}, requested ${item.quantity} (concurrent modification)`
                );
                continue;
              }
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity: fresh.quantity - item.quantity,
                  version: { increment: 1 },
                },
              });
            }
          }
        }

        // Create InventoryMovement
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type: "sale",
            quantity: -item.quantity,
            reason: isEscrow
              ? `Escrow completed INV-${referenceId.slice(-8)}`
              : `Local sale ${referenceId}`,
            referenceId,
            createdBy,
          },
        });

        // Update Product.stockQuantity (denormalized)
        const freshInventory = await tx.inventory.findUnique({ where: { id: inventory.id } });
        if (freshInventory) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: freshInventory.quantity },
          });
        }
      }

      if (conflicts.length > 0) {
        throw new Error(`STOCK_CONFLICT:${JSON.stringify(conflicts)}`);
      }

      return true;
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("STOCK_CONFLICT:")) {
      const conflicts: string[] = JSON.parse(error.message.slice("STOCK_CONFLICT:".length));
      return { success: false, conflicts };
    }
    console.error("deductStock error:", error);
    return { success: false, conflicts: ["Unexpected error during stock deduction"] };
  }
}

// ─── restockItems ──────────────────────────────────────────────────────

/**
 * Restock items (return to inventory).
 * Called on sale return or escrow cancellation after payment.
 * Uses optimistic locking with version increment.
 */
export async function restockItems(
  storeId: string,
  items: Array<{ productId: string; quantity: number }>,
  referenceId: string,
  createdBy: string
): Promise<boolean> {
  try {
    await db.$transaction(async (tx) => {
      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId_storeId: { productId: item.productId, storeId } },
        });

        if (!inventory) continue;
        if (!inventory.trackInventory) continue;

        const newQuantity = inventory.quantity + item.quantity;

        // Optimistic lock update
        const updated = await tx.inventory.updateMany({
          where: { id: inventory.id, version: inventory.version },
          data: {
            quantity: newQuantity,
            version: { increment: 1 },
            lastRestockedAt: new Date(),
          },
        });

        if (updated.count === 0) {
          // Retry with fresh version
          const fresh = await tx.inventory.findUnique({ where: { id: inventory.id } });
          if (fresh) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantity: fresh.quantity + item.quantity,
                version: { increment: 1 },
                lastRestockedAt: new Date(),
              },
            });
          }
        }

        // Create InventoryMovement
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type: "sale_return",
            quantity: item.quantity,
            reason: `Restock from ${referenceId}`,
            referenceId,
            createdBy,
          },
        });

        // Update Product.stockQuantity
        const freshInventory = await tx.inventory.findUnique({ where: { id: inventory.id } });
        if (freshInventory) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: freshInventory.quantity },
          });
        }
      }
    });

    return true;
  } catch (error) {
    console.error("restockItems error:", error);
    return false;
  }
}
