// // ═══════════════════════════════════════════════════════════════════════════
// // SHOPIFY SHIPPING ROUTES
// // backend/src/routes/shipping.routes.ts
// // ═══════════════════════════════════════════════════════════════════════════

// import express, { Request, Response } from 'express';
// import axios from 'axios';
// import prisma from '../config/database';

// const router = express.Router();

// // ═══════════════════════════════════════════════════════════════════════════
// // TYPES
// // ═══════════════════════════════════════════════════════════════════════════

// interface StoreCredentials {
//   shop: string;
//   accessToken: string;
//   storeName: string;
// }

// // ═══════════════════════════════════════════════════════════════════════════
// // HELPER: Get store credentials from database
// // ═══════════════════════════════════════════════════════════════════════════

// async function getStoreCredentials(storeId: string): Promise<StoreCredentials> {
//   const store = await prisma.store.findUnique({
//     where: { id: storeId },
//     select: {
//       id: true,
//       shopDomain: true,
//       accessToken: true,
//       storeName: true,
//     },
//   });

//   if (!store || !store.accessToken) {
//     throw new Error('Store not found or not authenticated');
//   }

//   return {
//     shop: store.shopDomain,
//     accessToken: store.accessToken,
//     storeName: store.storeName,
//   };
// }

// // ═══════════════════════════════════════════════════════════════════════════
// // ROUTE: Check Shopify Shipping Availability
// // GET /api/stores/:storeId/shipping/availability
// // ═══════════════════════════════════════════════════════════════════════════

// router.get('/stores/:storeId/shipping/availability', async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { storeId } = req.params;
//     const { shop, accessToken } = await getStoreCredentials(storeId);

//     console.log('🔍 Checking Shopify Shipping availability for:', shop);

//     // Check if Shopify Shipping is enabled
//     const response = await axios.get(
//       `https://${shop}/admin/api/2024-01/shop.json`,
//       {
//         headers: {
//           'X-Shopify-Access-Token': accessToken,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     const eligible = response.data.shop.eligible_for_shipping_labels || false;
//     const country = response.data.shop.country_code;

//     console.log(`✅ Shopify Shipping availability: ${eligible ? 'Available' : 'Not available'} (${country})`);

//     res.json({
//       eligible_for_shipping_labels: eligible,
//       country,
//       message: eligible 
//         ? 'Shopify Shipping is available' 
//         : 'Shopify Shipping is not available in your region',
//     });
//   } catch (error: any) {
//     console.error('❌ Shipping Availability Error:', error.response?.data || error.message);
//     res.status(500).json({
//       error: error.response?.data?.errors || error.message,
//       eligible_for_shipping_labels: false,
//     });
//   }
// });

// // ═══════════════════════════════════════════════════════════════════════════
// // ROUTE: Get Shopify Shipping Rates
// // POST /api/orders/store/:storeId/:orderId/shipping/rates
// // ═══════════════════════════════════════════════════════════════════════════

// router.post('/orders/store/:storeId/:orderId/shipping/rates', async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { storeId, orderId } = req.params;
//     const { weight, dimensions } = req.body;
//     const { shop, accessToken } = await getStoreCredentials(storeId);

//     console.log('📊 Fetching shipping rates for order:', orderId);

//     // Step 1: Get fulfillment orders for this order
//     const fulfillmentOrdersResponse = await axios.get(
//       `https://${shop}/admin/api/2024-01/orders/${orderId}/fulfillment_orders.json`,
//       {
//         headers: {
//           'X-Shopify-Access-Token': accessToken,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     const fulfillmentOrders = fulfillmentOrdersResponse.data.fulfillment_orders;
    
//     if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
//       res.status(400).json({
//         error: 'No fulfillment orders found for this order',
//       });
//       return;
//     }

//     const fulfillmentOrder = fulfillmentOrders[0];
//     const fulfillmentOrderId = fulfillmentOrder.id;

//     console.log('📦 Fulfillment Order ID:', fulfillmentOrderId);

//     // Step 2: Get the store's warehouse/origin address
//     // TODO: You can customize this per store by storing in database
//     const originAddress = {
//       address1: '123 Warehouse Street',
//       city: 'San Francisco',
//       province: 'CA',
//       zip: '94103',
//       country: 'US',
//     };

//     // Step 3: Request shipping rates from Shopify
//     const ratesResponse = await axios.post(
//       `https://${shop}/admin/api/2024-01/fulfillment_orders/${fulfillmentOrderId}/fulfillment_order_shipping_rates.json`,
//       {
//         fulfillment_order_shipping_rate: {
//           origin_address: originAddress,
//           shipping_method: {
//             weight: {
//               value: weight || 1,
//               unit: 'pounds',
//             },
//             dimensions: dimensions ? {
//               length: dimensions.length || 12,
//               width: dimensions.width || 8,
//               height: dimensions.height || 4,
//               unit: 'inches',
//             } : undefined,
//           },
//         },
//       },
//       {
//         headers: {
//           'X-Shopify-Access-Token': accessToken,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     const rates = ratesResponse.data.fulfillment_order_shipping_rates || [];

//     console.log(`✅ Found ${rates.length} shipping rates`);

//     res.json({
//       fulfillmentOrderId,
//       rates,
//     });
//   } catch (error: any) {
//     console.error('❌ Shipping Rates Error:', error.response?.data || error.message);
//     res.status(500).json({
//       error: error.response?.data?.errors || error.message,
//       details: error.response?.data,
//     });
//   }
// });

// // ═══════════════════════════════════════════════════════════════════════════
// // ROUTE: Purchase Shopify Shipping Label
// // POST /api/stores/:storeId/shipping/purchase-label
// // ═══════════════════════════════════════════════════════════════════════════

// router.post('/stores/:storeId/shipping/purchase-label', async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { storeId } = req.params;
//     const { fulfillmentOrderId, rateHandle, notifyCustomer } = req.body;
//     const { shop, accessToken } = await getStoreCredentials(storeId);

//     console.log('🏷️ Purchasing label:', { fulfillmentOrderId, rateHandle });

//     // Create fulfillment with shipping label
//     const fulfillmentResponse = await axios.post(
//       `https://${shop}/admin/api/2024-01/fulfillments.json`,
//       {
//         fulfillment: {
//           line_items_by_fulfillment_order: [
//             {
//               fulfillment_order_id: fulfillmentOrderId,
//             },
//           ],
//           notify_customer: notifyCustomer || false,
//           tracking_info: {
//             // Will be auto-filled by Shopify
//           },
//           shipping_label: {
//             shipping_rate_handle: rateHandle,
//           },
//         },
//       },
//       {
//         headers: {
//           'X-Shopify-Access-Token': accessToken,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     const fulfillment = fulfillmentResponse.data.fulfillment;

//     console.log('✅ Label purchased successfully');

//     res.json({
//       success: true,
//       tracking_number: fulfillment.tracking_number,
//       tracking_company: fulfillment.tracking_company,
//       tracking_url: fulfillment.tracking_url,
//       label_url: fulfillment.receipt?.label_url || null,
//       fulfillment_id: fulfillment.id,
//     });
//   } catch (error: any) {
//     console.error('❌ Label Purchase Error:', error.response?.data || error.message);
//     res.status(500).json({
//       error: error.response?.data?.errors || error.message,
//       details: error.response?.data,
//     });
//   }
// });

// // ═══════════════════════════════════════════════════════════════════════════
// // EXPORT ROUTER
// // ═══════════════════════════════════════════════════════════════════════════

// export default router;

// ═══════════════════════════════════════════════════════════════════════════
// SHOPIFY SHIPPING ROUTES
// backend/src/routes/shipping.routes.ts
// ═══════════════════════════════════════════════════════════════════════════

import express, { Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import prisma from '../config/database';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface StoreCredentials {
  shop: string;
  accessToken: string;
  storeName: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Axios instance with timeout + keep-alive (prevents ECONNRESET)
// ═══════════════════════════════════════════════════════════════════════════

const shopifyAxios = axios.create({
  timeout: 15000,
  httpsAgent: new https.Agent({ keepAlive: true }),
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Retry wrapper for Shopify API calls
// ═══════════════════════════════════════════════════════════════════════════

async function shopifyRequest<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable =
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.response?.status === 429 ||
        error.response?.status >= 500;

      if (isRetryable && attempt < retries) {
        const delay = Math.floor(Math.random() * 500 + 500 * attempt);
        console.log(`[Shipping] Attempt ${attempt} failed (${error.code || error.response?.status}), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get store credentials from database
// ═══════════════════════════════════════════════════════════════════════════

async function getStoreCredentials(storeId: string): Promise<StoreCredentials> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      shopDomain: true,
      accessToken: true,
      storeName: true,
    },
  });

  if (!store || !store.accessToken) {
    throw new Error('Store not found or not authenticated');
  }

  return {
    shop: store.shopDomain,
    accessToken: store.accessToken,
    storeName: store.storeName,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 1: Check Shopify Shipping Availability
//
// FIX: was GET /api/stores/:storeId/shipping/availability
// NOW: GET /api/orders/store/:storeId/shipping/availability  ← matches frontend
//
// FIX: shop.eligible_for_shipping_labels is NOT a real Shopify field.
// Shopify Shipping is available for stores in US and CA only.
// We check country_code from shop.json instead.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/store/:storeId/shipping/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { shop, accessToken } = await getStoreCredentials(storeId);

    console.log('🔍 Checking Shopify Shipping availability for:', shop);

    const response = await shopifyRequest(() =>
      shopifyAxios.get(`https://${shop}/admin/api/2024-01/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      })
    );

    const shopData = response.data.shop;
    const country = shopData.country_code;

    // Shopify Shipping is only available for US and CA stores
    const ELIGIBLE_COUNTRIES = ['US', 'CA'];
    const eligible = ELIGIBLE_COUNTRIES.includes(country);

    console.log(`✅ Shopify Shipping: ${eligible ? 'Available' : 'Not available'} (${country})`);

    res.json({
      eligible_for_shipping_labels: eligible,
      country,
      message: eligible
        ? 'Shopify Shipping is available'
        : 'Shopify Shipping is not available in your region',
    });
  } catch (error: any) {
    console.error('❌ Shipping Availability Error:', error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.errors || error.message,
      eligible_for_shipping_labels: false,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Shopify GraphQL request
// ═══════════════════════════════════════════════════════════════════════════

async function shopifyGraphQL(shop: string, accessToken: string, query: string, variables?: object) {
  const response = await shopifyRequest(() =>
    shopifyAxios.post(
      `https://${shop}/admin/api/2024-01/graphql.json`,
      { query, variables },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )
  );

  // Shopify returns GraphQL errors inside response.data.errors (HTTP 200)
  if (response.data.errors) {
    const msg = response.data.errors.map((e: any) => e.message).join(', ');
    throw new Error(`GraphQL error: ${msg}`);
  }

  return response.data.data;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 2: Get Real Shopify Shipping Rates via GraphQL
//
// POST /api/orders/store/:storeId/:orderId/shipping/rates
//
// Uses GraphQL fulfillmentOrderShippingRates — the only way to get
// real carrier rates, real prices, real handles, and delivery estimates
// from Shopify Shipping before purchase.
//
// Required scopes: read_merchant_managed_fulfillment_orders
// ═══════════════════════════════════════════════════════════════════════════

router.post('/store/:storeId/:orderId/shipping/rates', async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId, orderId } = req.params;
    const { shop, accessToken } = await getStoreCredentials(storeId);

    console.log('📊 Fetching real Shopify Shipping rates for order:', orderId);

    // Step 1: Get fulfillment order ID via REST
    // (REST is fine for this lookup — it's only rate fetching that needs GraphQL)
    const foResponse = await shopifyRequest(() =>
      shopifyAxios.get(
        `https://${shop}/admin/api/2024-01/orders/${orderId}/fulfillment_orders.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const fulfillmentOrders = foResponse.data.fulfillment_orders;

    if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
      res.status(400).json({ error: 'No fulfillment orders found for this order' });
      return;
    }

    const fulfillmentOrder = fulfillmentOrders.find((fo: any) => fo.status === 'open');

    if (!fulfillmentOrder) {
      res.status(400).json({
        error: 'This order is already fulfilled. No open fulfillment order available.',
      });
      return;
    }

    const fulfillmentOrderId = String(fulfillmentOrder.id);
    // GraphQL uses global IDs
    const fulfillmentOrderGid = `gid://shopify/FulfillmentOrder/${fulfillmentOrderId}`;

    console.log('📦 Fulfillment Order GID:', fulfillmentOrderGid);

    // Step 2: Fetch real rates via GraphQL
    const ratesQuery = `
      query GetShippingRates($id: ID!) {
        fulfillmentOrder(id: $id) {
          id
          status
          fulfillmentOrderShippingRates {
            title
            price {
              amount
              currencyCode
            }
            handle
            carrierIdentifier
            estimatedTimeInTransit {
              minimum
              maximum
            }
          }
        }
      }
    `;

    const gqlData = await shopifyGraphQL(shop, accessToken, ratesQuery, {
      id: fulfillmentOrderGid,
    });

    const rawRates = gqlData?.fulfillmentOrder?.fulfillmentOrderShippingRates || [];

    if (rawRates.length === 0) {
      res.status(400).json({
        error: 'No shipping rates available for this order. Ensure Shopify Shipping is enabled and the store address is set.',
      });
      return;
    }

    // Normalize to the shape the frontend ShopifyShippingRate interface expects
    const rates = rawRates.map((rate: any, idx: number) => ({
      id: `rate_${idx}_${rate.handle}`,
      shipping_rate_handle: rate.handle,
      title: rate.title,
      // Derive a clean service_code from the handle for display
      service_code: rate.handle?.split('-').pop()?.toUpperCase() || rate.carrierIdentifier?.toUpperCase() || 'STANDARD',
      currency: rate.price.currencyCode,
      total_price: rate.price.amount,
      // Shopify returns min/max transit days — show max as the conservative estimate
      delivery_days: rate.estimatedTimeInTransit?.maximum ?? null,
      carrier: rate.carrierIdentifier || null,
    }));

    console.log(`✅ Got ${rates.length} real Shopify Shipping rates`);

    res.json({ fulfillmentOrderId, rates });
  } catch (error: any) {
    console.error('❌ Shipping Rates Error:', error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.errors || error.message,
      details: error.response?.data,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 3: Purchase Shopify Shipping Label via GraphQL
//
// POST /api/orders/store/:storeId/shipping/purchase
//
// Uses GraphQL fulfillmentCreateV2 mutation with the real rate handle
// returned by the rates query above. This is the correct and reliable way
// to purchase a Shopify Shipping label — the REST fulfillments.json endpoint
// does not reliably support shipping_rate_handle.
//
// Required scopes:
//   write_merchant_managed_fulfillment_orders
//   write_fulfillments
// ═══════════════════════════════════════════════════════════════════════════

router.post('/store/:storeId/shipping/purchase', async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { fulfillmentOrderId, rateHandle, notifyCustomer } = req.body;
    const { shop, accessToken } = await getStoreCredentials(storeId);

    if (!fulfillmentOrderId || !rateHandle) {
      res.status(400).json({ error: 'fulfillmentOrderId and rateHandle are required' });
      return;
    }

    const fulfillmentOrderGid = `gid://shopify/FulfillmentOrder/${fulfillmentOrderId}`;

    console.log('🏷️ Purchasing Shopify Shipping label via GraphQL:', { fulfillmentOrderGid, rateHandle });

    // GraphQL mutation — purchases the label and creates the fulfillment in one step
    const purchaseMutation = `
      mutation FulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
        fulfillmentCreateV2(fulfillment: $fulfillment) {
          fulfillment {
            id
            status
            trackingInfo {
              number
              company
              url
            }
            fulfillmentLineItems(first: 5) {
              edges {
                node {
                  id
                  quantity
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      fulfillment: {
        lineItemsByFulfillmentOrder: [
          {
            fulfillmentOrderId: fulfillmentOrderGid,
          },
        ],
        notifyCustomer: notifyCustomer ?? true,
        shippingLabelInput: {
          shippingRateHandle: rateHandle,
        },
      },
    };

    const gqlData = await shopifyGraphQL(shop, accessToken, purchaseMutation, variables);

    const result = gqlData?.fulfillmentCreateV2;

    // Surface any Shopify user errors (e.g. invalid rate handle, out of stock)
    if (result?.userErrors?.length > 0) {
      const errorMsg = result.userErrors.map((e: any) => e.message).join(', ');
      console.error('❌ Shopify user errors:', result.userErrors);
      res.status(400).json({ error: errorMsg, userErrors: result.userErrors });
      return;
    }

    const fulfillment = result?.fulfillment;

    if (!fulfillment) {
      res.status(500).json({ error: 'Fulfillment was not created — no fulfillment returned from Shopify' });
      return;
    }

    // Extract tracking from GraphQL response shape
    // trackingInfo is an array — take the first entry
    const trackingInfo = fulfillment.trackingInfo?.[0] || {};

    console.log('✅ Label purchased, fulfillment ID:', fulfillment.id);

    res.json({
      success: true,
      tracking_number: trackingInfo.number || '',
      tracking_company: trackingInfo.company || '',
      tracking_url: trackingInfo.url || '',
      fulfillment_id: fulfillment.id,
      // Note: label PDF URL is only accessible via Shopify admin UI after purchase
      // Shopify does not return a direct label_url in the API response
      label_url: null,
    });
  } catch (error: any) {
    console.error('❌ Label Purchase Error:', error.response?.data || error.message);

    const shopifyError =
      error.response?.data?.errors ||
      error.response?.data?.error ||
      error.message;

    res.status(error.response?.status || 500).json({
      error: typeof shopifyError === 'object'
        ? JSON.stringify(shopifyError)
        : shopifyError,
      details: error.response?.data,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default router;