import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import axios from 'axios';

const router = Router();

// ─── GET /api/sales/summary ───────────────────────────────────────────────────
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    const dateFrom = from
      ? new Date(`${from}T00:00:00Z`)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = to
      ? new Date(`${to}T23:59:59Z`)
      : new Date();

    const stores = await prisma.store.findMany({
      where: { isActive: true },
    });

    // ✅ Process stores in batches of 5 to avoid connection floods
    const BATCH_SIZE = 5;
    const salesData: any[] = [];

    for (let i = 0; i < stores.length; i += BATCH_SIZE) {
      const batch = stores.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((store) => fetchStoreSales(store, dateFrom, dateTo))
      );

      // Retry once on transient network errors, then fall back to empty store
      const retryPromises = batchResults.map(async (result, j) => {
        if (result.status === 'fulfilled') return result.value;

        const store = batch[j];
        const errCode = (result.reason as any)?.code;
        const errMsg  = (result.reason as any)?.message ?? String(result.reason);
        const isNetworkErr = ['ECONNRESET','ETIMEDOUT','ECONNREFUSED','ENOTFOUND'].includes(errCode);

        if (isNetworkErr) {
          try {
            await new Promise((r) => setTimeout(r, 1000));
            return await fetchStoreSales(store, dateFrom, dateTo);
          } catch {
            console.warn(`[sales] ${store.storeName} (${store.shopDomain}) unreachable (${errCode}) — skipped`);
            return buildEmptyStore(store);
          }
        }

        console.warn(`[sales] ${store.storeName}: ${errMsg}`);
        return buildEmptyStore(store);
      });

      const resolved = await Promise.all(retryPromises);
      salesData.push(...resolved);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < stores.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    const grandTotal = salesData.reduce(
      (acc, s) => ({
        totalOrders: acc.totalOrders + s.totalOrders,
        totalRevenue: acc.totalRevenue + s.totalRevenue,
        totalRefunds: acc.totalRefunds + s.totalRefunds,
        netRevenue: acc.netRevenue + s.netRevenue,
      }),
      { totalOrders: 0, totalRevenue: 0, totalRefunds: 0, netRevenue: 0 }
    );

    res.json({
      stores: salesData,
      grandTotal,
      generatedAt: new Date().toISOString(),
      dateRange: {
        from: dateFrom.toISOString().slice(0, 10),
        to: dateTo.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Sales summary error:', error);
    res.status(500).json({ error: 'Failed to generate sales summary' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchStoreSales(store: any, dateFrom: Date, dateTo: Date) {
  const baseUrl = `https://${store.shopDomain}/admin/api/2024-01`;
  const headers = { 'X-Shopify-Access-Token': store.accessToken };

  let allOrders: any[] = [];
  let pageInfo: string | null = null;
  let isFirstPage = true;

  while (isFirstPage || pageInfo) {
    // ✅ page_info cannot be mixed with other filter params
    const params: Record<string, string> = pageInfo
      ? { page_info: pageInfo, limit: '250' }
      : {
          status: 'any',
          limit: '250',
          created_at_min: dateFrom.toISOString(),
          created_at_max: dateTo.toISOString(),
        };

    const response = await axios.get(`${baseUrl}/orders.json`, {
      headers,
      params,
      timeout: 15000, // ✅ 15s timeout — don't hang forever on dead stores
    });

    const orders: any[] = response.data.orders ?? [];
    allOrders = allOrders.concat(orders);
    isFirstPage = false;

    const linkHeader: string = response.headers['link'] ?? '';
    const match = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
    pageInfo = match ? match[1] : null;
  }

  let totalRevenue = 0;
  let totalRefunds = 0;
  let paidOrders = 0;
  let pendingOrders = 0;
  let cancelledOrders = 0;
  const productMap: Record<string, { quantity: number; revenue: number }> = {};

  // ✅ Read currency from the first order — reflects the store's actual currency
  // Falls back to store.currency from DB, then 'USD' as last resort
  const detectedCurrency: string =
    allOrders[0]?.currency ?? store.currency ?? 'USD';

  for (const order of allOrders) {
    const price = parseFloat(order.total_price ?? '0') || 0;

    // ✅ Refunds live in order.refunds[].transactions[], not total_refunds
    const refundAmount = (order.refunds ?? []).reduce((sum: number, r: any) => {
      return sum + (r.transactions ?? []).reduce((s: number, t: any) =>
        s + (parseFloat(t.amount ?? '0') || 0), 0
      );
    }, 0);

    totalRevenue += price;
    totalRefunds += refundAmount;

    if (order.cancel_reason) {
      cancelledOrders++;
    } else if (
      order.financial_status === 'paid' ||
      order.financial_status === 'partially_paid'
    ) {
      paidOrders++;
    } else {
      pendingOrders++;
    }

    for (const item of order.line_items ?? []) {
      const key = item.title ?? 'Unknown';
      if (!productMap[key]) productMap[key] = { quantity: 0, revenue: 0 };
      productMap[key].quantity += item.quantity ?? 0;
      productMap[key].revenue += (parseFloat(item.price ?? '0') || 0) * (item.quantity ?? 0);
    }
  }

  const netRevenue = totalRevenue - totalRefunds;
  const totalOrders = allOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const topProducts = Object.entries(productMap)
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    storeId: store.id,
    storeName: store.storeName,
    shopDomain: store.shopDomain,
    currency: detectedCurrency,
    totalOrders,
    totalRevenue,
    totalRefunds,
    netRevenue,
    avgOrderValue,
    paidOrders,
    pendingOrders,
    cancelledOrders,
    topProducts,
  };
}

function buildEmptyStore(store: any) {
  return {
    storeId: store.id,
    storeName: store.storeName,
    shopDomain: store.shopDomain,
    currency: store.currency ?? 'USD',
    totalOrders: 0,
    totalRevenue: 0,
    totalRefunds: 0,
    netRevenue: 0,
    avgOrderValue: 0,
    paidOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    topProducts: [],
  };
}

export default router;