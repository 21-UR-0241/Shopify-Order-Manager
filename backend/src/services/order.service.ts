import { storeService } from './store.service';
import { clientManager } from '../shopify-client';
import prisma from '../db';

export interface OrderFilters {
  limit?: number;
  status?: 'open' | 'closed' | 'cancelled' | 'any';
  financial_status?: string;
  fulfillment_status?: string;
  created_at_min?: string;
  created_at_max?: string;
  page_info?: string; // For Shopify pagination
}

export interface FulfillmentData {
  tracking_number?: string;
  tracking_company?: string;
  tracking_url?: string;
  notify_customer?: boolean;
}

export interface RefundData {
  amount: number;
  reason?: string;
  restock?: boolean;
  notify?: boolean;
}

class OrderService {
  async getOrdersFromStore(storeId: string, filters?: OrderFilters) {
    const client = await storeService.getClientForStore(storeId);

    const query: any = {
      limit: filters?.limit?.toString() || '50',
      status: filters?.status || 'any',
    };

    if (filters?.financial_status) {
      query.financial_status = filters.financial_status;
    }
    if (filters?.fulfillment_status) {
      query.fulfillment_status = filters.fulfillment_status;
    }
    if (filters?.created_at_min) {
      query.created_at_min = filters.created_at_min;
    }
    if (filters?.created_at_max) {
      query.created_at_max = filters.created_at_max;
    }
    if (filters?.page_info) {
      query.page_info = filters.page_info;
    }

    const response = await client.get({
      path: 'orders',
      query,
    });

    const store = await storeService.getStore(storeId);

    return {
      storeId,
      storeName: store?.storeName,
      shopDomain: store?.shopDomain,
      orders: response.body.orders,
      pageInfo: response.pageInfo,
    };
  }

  async getOrdersFromAllStores(filters?: OrderFilters) {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
    });

    const ordersPromises = stores.map(async (store) => {
      try {
        const client = clientManager.createRestClient(
          store.shopDomain,
          store.accessToken
        );

        const query: any = {
          limit: filters?.limit?.toString() || '50',
          status: filters?.status || 'any',
        };

        if (filters?.financial_status) query.financial_status = filters.financial_status;
        if (filters?.fulfillment_status) query.fulfillment_status = filters.fulfillment_status;
        if (filters?.created_at_min) query.created_at_min = filters.created_at_min;
        if (filters?.created_at_max) query.created_at_max = filters.created_at_max;
        if (filters?.page_info) query.page_info = filters.page_info;

        const response = await client.get({
          path: 'orders',
          query,
        });

        return {
          storeId: store.id,
          storeName: store.storeName,
          shopDomain: store.shopDomain,
          orders: response.body.orders,
          pageInfo: response.pageInfo,
          success: true,
        };
      } catch (error: any) {
        console.error(`Error fetching orders from ${store.shopDomain}:`, error.message);
        return {
          storeId: store.id,
          storeName: store.storeName,
          shopDomain: store.shopDomain,
          orders: [],
          pageInfo: { hasNext: false, hasPrevious: false },
          success: false,
          error: error.message,
        };
      }
    });

    return await Promise.all(ordersPromises);
  }

  // async getOrder(storeId: string, orderId: string) {
  //   const client = await storeService.getClientForStore(storeId);

  //   const response = await client.get({
  //     path: `orders/${orderId}`,
  //   });

  //   const store = await storeService.getStore(storeId);

  //   return {
  //     storeId,
  //     storeName: store?.storeName,
  //     shopDomain: store?.shopDomain,
  //     order: response.body.order,
  //   };
  // }

  async fulfillOrder(storeId: string, orderId: string, fulfillmentData: FulfillmentData) {
    const client = await storeService.getClientForStore(storeId);

    // Get order to find line items
    const orderResponse = await client.get({
      path: `orders/${orderId}`,
    });

    const order = orderResponse.body.order;

    // Get unfulfilled line items
    const unfulfilledItems = order.line_items
      .filter((item: any) => !item.fulfillment_status || item.fulfillment_status === null)
      .map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
      }));

    if (unfulfilledItems.length === 0) {
      throw new Error('All items in this order are already fulfilled');
    }

    const response = await client.post({
      path: `orders/${orderId}/fulfillments`,
      data: {
        fulfillment: {
          line_items: unfulfilledItems,
          tracking_number: fulfillmentData.tracking_number,
          tracking_company: fulfillmentData.tracking_company,
          tracking_url: fulfillmentData.tracking_url,
          notify_customer: fulfillmentData.notify_customer !== false,
        },
      },
    });

    return response.body.fulfillment;
  }

  async cancelOrder(storeId: string, orderId: string, reason?: string, restock?: boolean) {
    const client = await storeService.getClientForStore(storeId);

    const response = await client.post({
      path: `orders/${orderId}/cancel`,
      data: {
        reason: reason || 'customer',
        restock: restock !== false,
        email: true,
      },
    });

    return response.body.order;
  }

  async updateOrder(storeId: string, orderId: string, updateData: any) {
    const client = await storeService.getClientForStore(storeId);

    const response = await client.put({
      path: `orders/${orderId}`,
      data: {
        order: updateData,
      },
    });

    return response.body.order;
  }

  async createRefund(storeId: string, orderId: string, refundData: RefundData) {
    const client = await storeService.getClientForStore(storeId);

    // Get the order first to find transaction info
    const orderResponse = await client.get({
      path: `orders/${orderId}`,
    });

    const order = orderResponse.body.order;
    const transaction = order.transactions.find((t: any) => t.kind === 'sale' && t.status === 'success');

    if (!transaction) {
      throw new Error('No successful transaction found for this order');
    }

    const response = await client.post({
      path: `orders/${orderId}/refunds`,
      data: {
        refund: {
          currency: order.currency,
          notify: refundData.notify !== false,
          note: refundData.reason,
          shipping: {
            full_refund: false,
          },
          transactions: [
            {
              parent_id: transaction.id,
              amount: refundData.amount,
              kind: 'refund',
              gateway: transaction.gateway,
            },
          ],
        },
      },
    });

    return response.body.refund;
  }

async duplicateOrder(storeId: string, orderId: string) {
  try {
    const client = await storeService.getClientForStore(storeId);

    // Get the original order
    const orderResponse = await client.get({
      path: `orders/${orderId}`,
    });

    const originalOrder = orderResponse.body.order;

    if (!originalOrder) {
      throw new Error('Original order not found');
    }

    // Helper function to safely get email
    const getValidEmail = (order: any): string | undefined => {
      if (order.email && typeof order.email === 'string' && order.email !== 'false' && order.email !== 'true') {
        return order.email;
      }
      if (order.customer?.email && typeof order.customer.email === 'string' && order.customer.email !== 'false') {
        return order.customer.email;
      }
      return undefined;
    };

    // Filter and map line items - handle null variant_id
    const lineItems = originalOrder.line_items
      .filter((item: any) => item.variant_id !== null && item.variant_id !== undefined)
      .map((item: any) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
      }));

    // Check if we have any valid line items
    if (lineItems.length === 0) {
      throw new Error('Cannot duplicate order: All products have been deleted or are unavailable. Please create a new order manually.');
    }

    // Warn if some items were skipped
    const skippedItems = originalOrder.line_items.length - lineItems.length;
    if (skippedItems > 0) {
      console.warn(`⚠️  Skipped ${skippedItems} deleted/unavailable product(s) from the duplicate order`);
    }

    // Prepare draft order data with proper validation
    const draftOrderData: any = {
      line_items: lineItems,
      note: skippedItems > 0 
        ? `Duplicated from order ${originalOrder.name} (${skippedItems} deleted product(s) excluded)`
        : `Duplicated from order ${originalOrder.name}`,
    };

    // Add customer if exists
    if (originalOrder.customer?.id) {
      draftOrderData.customer = { id: originalOrder.customer.id };
    }

    // Add email if valid
    const validEmail = getValidEmail(originalOrder);
    if (validEmail) {
      draftOrderData.email = validEmail;
    }

    // Add tags if exists
    if (originalOrder.tags && typeof originalOrder.tags === 'string' && originalOrder.tags.trim() !== '') {
      draftOrderData.tags = originalOrder.tags;
    }

    // Add billing address if complete
    if (originalOrder.billing_address && originalOrder.billing_address.address1) {
      draftOrderData.billing_address = {
        first_name: originalOrder.billing_address.first_name,
        last_name: originalOrder.billing_address.last_name,
        address1: originalOrder.billing_address.address1,
        address2: originalOrder.billing_address.address2,
        city: originalOrder.billing_address.city,
        province: originalOrder.billing_address.province,
        country: originalOrder.billing_address.country,
        zip: originalOrder.billing_address.zip,
        phone: originalOrder.billing_address.phone,
      };
    }

    // Add shipping address if complete
    if (originalOrder.shipping_address && originalOrder.shipping_address.address1) {
      draftOrderData.shipping_address = {
        first_name: originalOrder.shipping_address.first_name,
        last_name: originalOrder.shipping_address.last_name,
        address1: originalOrder.shipping_address.address1,
        address2: originalOrder.shipping_address.address2,
        city: originalOrder.shipping_address.city,
        province: originalOrder.shipping_address.province,
        country: originalOrder.shipping_address.country,
        zip: originalOrder.shipping_address.zip,
        phone: originalOrder.shipping_address.phone,
      };
    }

    console.log('Creating draft order with data:', JSON.stringify(draftOrderData, null, 2));

    // Create draft order
    const response = await client.post({
      path: 'draft_orders',
      data: {
        draft_order: draftOrderData,
      },
    });

    const draftOrder = response.body.draft_order;

    // Add warning message if items were skipped
    if (skippedItems > 0) {
      return {
        ...draftOrder,
        _warning: `${skippedItems} deleted product(s) were excluded from the duplicate order`,
      };
    }

    return draftOrder;
  } catch (error: any) {
    // Enhanced error logging
    console.error('=== DUPLICATE ORDER ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error status:', error.response?.statusCode || error.status);
    console.error('Error body:', JSON.stringify(error.response?.body, null, 2));
    console.error('=============================');
    
    // Try to extract meaningful error message
    let errorMessage = 'Failed to duplicate order';
    
    if (error.response?.body?.errors) {
      const errors = error.response.body.errors;
      if (typeof errors === 'string') {
        errorMessage = errors;
      } else if (typeof errors === 'object') {
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => {
            const msg = Array.isArray(value) ? value.join(', ') : value;
            return `${key}: ${msg}`;
          })
          .join('; ');
        errorMessage = errorMessages || errorMessage;
      }
    } else if (error.response?.body?.error) {
      errorMessage = error.response.body.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

  // ✨ NEW METHOD: Create Order
  async createOrder(storeId: string, orderData: {
    line_items: Array<{
      variant_id: number;
      quantity: number;
      price?: string;
    }>;
    customer?: {
      id?: number;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
    billing_address?: any;
    shipping_address?: any;
    financial_status?: string;
    send_receipt?: boolean;
    send_fulfillment_receipt?: boolean;
    note?: string;
    tags?: string;
  }) {
    const client = await storeService.getClientForStore(storeId);

    const response = await client.post({
      path: 'orders',
      data: {
        order: {
          ...orderData,
          financial_status: orderData.financial_status || 'pending',
        },
      },
    });

    return response.body.order;
  }





// ═══════════════════════════════════════════════════════════════════════════
// UPDATE 1: GET ORDER - Support both draft and regular orders
// ═══════════════════════════════════════════════════════════════════════════

async getOrder(storeId: string, orderId: string) {
  const client = await storeService.getClientForStore(storeId);
  const store  = await storeService.getStore(storeId);

  // ── Try regular order first (most common case) ──────────────────────────
  try {
    const res = await client.get({ path: `orders/${orderId}` });
    if (res.body?.order) {
      console.log(`✅ Regular order: ${res.body.order.name}`);
      return {
        storeId,
        storeName:  store?.storeName,
        shopDomain: store?.shopDomain,
        order:      res.body.order,
        isDraft:    false,
      };
    }
  } catch (err: any) {
    const status = err.response?.statusCode ?? err.response?.status ?? err.status;
    // Only continue to draft fallback on 404 — all other errors should throw
    if (status !== 404) {
      console.error(`❌ Error fetching regular order ${orderId}:`, err.message);
      throw new Error(err.message || `Failed to fetch order ${orderId}`);
    }
    console.log(`ℹ️  Order ${orderId} not found as regular order (404), trying draft…`);
  }

  // ── Fallback: try draft order ────────────────────────────────────────────
  try {
    const res = await client.get({ path: `draft_orders/${orderId}` });
    if (res.body?.draft_order) {
      console.log(`✅ Draft order: ${res.body.draft_order.name}`);
      return {
        storeId,
        storeName:  store?.storeName,
        shopDomain: store?.shopDomain,
        order:      res.body.draft_order,
        isDraft:    true,
      };
    }
  } catch (err: any) {
    const status = err.response?.statusCode ?? err.response?.status ?? err.status;
    console.error(`❌ Draft order fetch failed (${status}):`, err.message);
  }

  throw new Error(`Order not found with ID: ${orderId}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE 2: ADD LINE ITEMS - Better error handling and logging
// ═══════════════════════════════════════════════════════════════════════════

async addLineItems(storeId: string, orderId: string, items: Array<{ variant_id: number; quantity: number }>) {
  try {
    const client = await storeService.getClientForStore(storeId);

    console.log(`📝 Attempting to add ${items.length} item(s) to order ${orderId}`);

    // Try as draft order first
    try {
      console.log(`🔍 Checking if ${orderId} is a draft order...`);
      
      const draftResponse = await client.get({
        path: `draft_orders/${orderId}`,
      });
      
      const draft = draftResponse.body.draft_order;
      
      console.log(`✅ Found draft order: ${draft.name} (ID: ${draft.id})`);
      
      // Combine existing and new items
      const updatedLineItems = [
        ...draft.line_items.map((item: any) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        ...items,
      ];

      console.log(`📦 Updating draft order with ${updatedLineItems.length} total items`);

      const response = await client.put({
        path: `draft_orders/${orderId}`,
        data: {
          draft_order: {
            line_items: updatedLineItems,
          },
        },
      });

      console.log(`✅ Successfully added items to draft order ${draft.name}`);

      return {
        success: true,
        order: response.body.draft_order,
        message: `${items.length} item(s) added successfully`,
        isDraft: true,
      };
    } catch (draftError: any) {
      console.log(`❌ Not a draft order. Checking if it's a regular order...`);
      
      // Not a draft - check if it's a regular order
      try {
        const orderResponse = await client.get({
          path: `orders/${orderId}`,
        });

        const order = orderResponse.body.order;
        
        console.error(`❌ Found REGULAR order ${order.name} (ID: ${order.id}). Cannot modify.`);
        console.error(`   - Financial Status: ${order.financial_status}`);
        console.error(`   - Fulfillment Status: ${order.fulfillment_status || 'none'}`);
        
        throw new Error(
          `Cannot modify completed order ${order.name}. ` +
          `This order has been finalized (Payment: ${order.financial_status}). ` +
          `Items can only be added to draft orders. ` +
          `Please use the "Modify Order" tab for alternatives.`
        );
      } catch (orderError: any) {
        // Neither draft nor regular order found
        if (orderError.message?.includes('Cannot modify completed order')) {
          throw orderError; // Re-throw our custom error
        }
        
        console.error(`❌ Order ${orderId} not found as draft or regular order`);
        throw new Error(`Order not found with ID: ${orderId}`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error adding line items:`, error.message);
    throw new Error(error.message || 'Failed to add line items');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE 3: REMOVE LINE ITEMS - Better error handling and logging
// ═══════════════════════════════════════════════════════════════════════════

async removeLineItems(storeId: string, orderId: string, lineItemIds: number[]) {
  try {
    const client = await storeService.getClientForStore(storeId);

    console.log(`📝 Attempting to remove ${lineItemIds.length} item(s) from order ${orderId}`);

    try {
      console.log(`🔍 Checking if ${orderId} is a draft order...`);
      
      const draftResponse = await client.get({
        path: `draft_orders/${orderId}`,
      });
      
      const draft = draftResponse.body.draft_order;
      
      console.log(`✅ Found draft order: ${draft.name} (ID: ${draft.id})`);

      const remainingItems = draft.line_items
        .filter((item: any) => !lineItemIds.includes(item.id))
        .map((item: any) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        }));

      if (remainingItems.length === 0) {
        throw new Error('Cannot remove all items. Delete the draft order instead.');
      }

      console.log(`📦 Updating draft order. Keeping ${remainingItems.length} items, removing ${lineItemIds.length} items`);

      const response = await client.put({
        path: `draft_orders/${orderId}`,
        data: {
          draft_order: {
            line_items: remainingItems,
          },
        },
      });

      console.log(`✅ Successfully removed items from draft order ${draft.name}`);

      return {
        success: true,
        order: response.body.draft_order,
        message: `${lineItemIds.length} item(s) removed successfully`,
        isDraft: true,
      };
    } catch (draftError: any) {
      console.log(`❌ Not a draft order. Checking if it's a regular order...`);
      
      try {
        const orderResponse = await client.get({
          path: `orders/${orderId}`,
        });

        const order = orderResponse.body.order;
        
        console.error(`❌ Found REGULAR order ${order.name} (ID: ${order.id}). Cannot modify.`);
        
        throw new Error(
          `Cannot modify completed order ${order.name}. ` +
          `Items can only be removed from draft orders. ` +
          `Please use the "Modify Order" tab for alternatives.`
        );
      } catch (orderError: any) {
        if (orderError.message?.includes('Cannot modify completed order')) {
          throw orderError;
        }
        
        console.error(`❌ Order ${orderId} not found`);
        throw new Error(`Order not found with ID: ${orderId}`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error removing line items:`, error.message);
    throw new Error(error.message || 'Failed to remove line items');
  }
}




// ═══════════════════════════════════════════════════════════════════════════
// ADD NOTE TO ORDER
// ═══════════════════════════════════════════════════════════════════════════

async addNote(storeId: string, orderId: string, note: string, append: boolean = true) {
  try {
    const client = await storeService.getClientForStore(storeId);

    console.log(`📝 Adding note to order ${orderId}`);

    // Try as draft order first
    try {
      const draftResponse = await client.get({
        path: `draft_orders/${orderId}`,
      });

      const draft = draftResponse.body.draft_order;
      const existingNote = draft.note || '';
      
      const updatedNote = append && existingNote
        ? `${existingNote}\n\n${note}`
        : note;

      const response = await client.put({
        path: `draft_orders/${orderId}`,
        data: {
          draft_order: {
            note: updatedNote,
          },
        },
      });

      console.log(`✅ Successfully added note to draft order ${draft.name}`);

      return {
        success: true,
        order: response.body.draft_order,
        message: 'Note added successfully',
        isDraft: true,
      };
    } catch (draftError) {
      // Try as regular order
      const orderResponse = await client.get({
        path: `orders/${orderId}`,
      });

      const order = orderResponse.body.order;
      const existingNote = order.note || '';
      
      const updatedNote = append && existingNote
        ? `${existingNote}\n\n${note}`
        : note;

      const response = await client.put({
        path: `orders/${orderId}`,
        data: {
          order: {
            note: updatedNote,
          },
        },
      });

      console.log(`✅ Successfully added note to regular order ${order.name}`);

      return {
        success: true,
        order: response.body.order,
        message: 'Note added successfully',
        isDraft: false,
      };
    }
  } catch (error: any) {
    console.error(`❌ Error adding note:`, error.message);
    throw new Error(error.message || 'Failed to add note');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK TAG ORDERS
// ═══════════════════════════════════════════════════════════════════════════

async bulkTagOrders(storeId: string, orderIds: string[], tags: string) {
  try {
    const client = await storeService.getClientForStore(storeId);

    console.log(`🏷️ Bulk tagging ${orderIds.length} orders with: ${tags}`);

    const results = await Promise.allSettled(
      orderIds.map(async (orderId) => {
        try {
          // Try as draft order first
          try {
            const draftResponse = await client.get({
              path: `draft_orders/${orderId}`,
            });

            const draft = draftResponse.body.draft_order;
            const existingTags = draft.tags || '';
            
            // Merge tags - avoid duplicates
            const existingTagsArray = existingTags.split(',').map((t: string) => t.trim()).filter(Boolean);
            const newTagsArray = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            const mergedTags = [...new Set([...existingTagsArray, ...newTagsArray])].join(', ');

            const response = await client.put({
              path: `draft_orders/${orderId}`,
              data: {
                draft_order: {
                  tags: mergedTags,
                },
              },
            });

            return {
              orderId,
              success: true,
              order: response.body.draft_order,
              isDraft: true,
            };
          } catch (draftError) {
            // Try as regular order
            const orderResponse = await client.get({
              path: `orders/${orderId}`,
            });

            const order = orderResponse.body.order;
            const existingTags = order.tags || '';
            
            const existingTagsArray = existingTags.split(',').map((t: string) => t.trim()).filter(Boolean);
            const newTagsArray = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            const mergedTags = [...new Set([...existingTagsArray, ...newTagsArray])].join(', ');

            const response = await client.put({
              path: `orders/${orderId}`,
              data: {
                order: {
                  tags: mergedTags,
                },
              },
            });

            return {
              orderId,
              success: true,
              order: response.body.order,
              isDraft: false,
            };
          }
        } catch (error: any) {
          return {
            orderId,
            success: false,
            error: error.message,
          };
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`✅ Bulk tagging complete: ${successful} successful, ${failed} failed`);

    return {
      total: orderIds.length,
      successful,
      failed,
      results: results.map((r) => r.status === 'fulfilled' ? r.value : { success: false, error: 'Unknown error' }),
    };
  } catch (error: any) {
    console.error(`❌ Error bulk tagging orders:`, error.message);
    throw new Error(error.message || 'Failed to bulk tag orders');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ORDERS TO CSV
// ═══════════════════════════════════════════════════════════════════════════

async exportOrdersToCSV(storeId: string, orderIds: string[]) {
  try {
    const client = await storeService.getClientForStore(storeId);

    console.log(`📊 Exporting ${orderIds.length} orders to CSV`);

    // Fetch all orders
    const ordersData = await Promise.all(
      orderIds.map(async (orderId) => {
        try {
          // Try as draft order first
          try {
            const draftResponse = await client.get({
              path: `draft_orders/${orderId}`,
            });
            return { order: draftResponse.body.draft_order, isDraft: true };
          } catch (draftError) {
            // Try as regular order
            const orderResponse = await client.get({
              path: `orders/${orderId}`,
            });
            return { order: orderResponse.body.order, isDraft: false };
          }
        } catch (error: any) {
          console.error(`Failed to fetch order ${orderId}:`, error.message);
          return null;
        }
      })
    );

    // Filter out failed fetches
    const validOrders = ordersData.filter((o) => o !== null);

    if (validOrders.length === 0) {
      throw new Error('No valid orders to export');
    }

    // Build CSV headers
    const headers = [
      'Order ID',
      'Order Name',
      'Order Type',
      'Created At',
      'Customer Name',
      'Customer Email',
      'Financial Status',
      'Fulfillment Status',
      'Total Price',
      'Currency',
      'Items Count',
      'Tags',
      'Note',
    ];

    // Build CSV rows
    const rows = validOrders.map((orderData) => {
      const order = orderData!.order;
      const customerName = order.customer
        ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
        : 'N/A';
      const customerEmail = order.email || order.customer?.email || 'N/A';
      const itemsCount = order.line_items?.length || 0;
      
      return [
        order.id || 'N/A',
        order.name || 'N/A',
        orderData!.isDraft ? 'Draft' : 'Regular',
        order.created_at || 'N/A',
        customerName,
        customerEmail,
        order.financial_status || 'N/A',
        order.fulfillment_status || 'none',
        order.total_price || '0.00',
        order.currency || 'USD',
        itemsCount,
        order.tags || '',
        order.note || '',
      ];
    });

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape cells that contain commas, quotes, or newlines
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ),
    ].join('\n');

    console.log(`✅ Successfully exported ${validOrders.length} orders to CSV`);

    return {
      success: true,
      csvContent,
      totalOrders: validOrders.length,
      fileName: `orders_export_${new Date().toISOString().split('T')[0]}.csv`,
    };
  } catch (error: any) {
    console.error(`❌ Error exporting orders to CSV:`, error.message);
    throw new Error(error.message || 'Failed to export orders to CSV');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET PRODUCTS (for adding items to orders)
// ═══════════════════════════════════════════════════════════════════════════

async getProducts(storeId: string, limit: number = 250) {
  try {
    const client = await storeService.getClientForStore(storeId);

    console.log(`📦 Fetching products for store ${storeId}`);

    const response = await client.get({
      path: 'products',
      query: {
        limit: limit.toString(),
        status: 'active',
      },
    });

    const products = response.body.products;

    console.log(`✅ Fetched ${products.length} products`);

    return {
      success: true,
      products,
      total: products.length,
    };
  } catch (error: any) {
    console.error(`❌ Error fetching products:`, error.message);
    throw new Error(error.message || 'Failed to fetch products');
  }
}


  
}

export const orderService = new OrderService();