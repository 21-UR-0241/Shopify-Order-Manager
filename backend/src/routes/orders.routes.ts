// import express, { Request, Response } from 'express';
// import { orderService } from '../services/order.service';

// const router = express.Router();

// // Get orders from all stores
// router.get('/all', async (req: Request, res: Response) => {
//   try {
//     const filters = {
//       limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
//       status: req.query.status as any,
//       financial_status: req.query.financial_status as string,
//       fulfillment_status: req.query.fulfillment_status as string,
//       created_at_min: req.query.created_at_min as string,
//       created_at_max: req.query.created_at_max as string,
//       page_info: req.query.page_info as string, // For Shopify pagination
//     };

//     const allOrders = await orderService.getOrdersFromAllStores(filters);
//     res.json(allOrders);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get orders from specific store
// router.get('/store/:storeId', async (req: Request, res: Response) => {
//   try {
//     const { storeId } = req.params;
//     const filters = {
//       limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
//       status: req.query.status as any,
//       financial_status: req.query.financial_status as string,
//       fulfillment_status: req.query.fulfillment_status as string,
//       created_at_min: req.query.created_at_min as string,
//       created_at_max: req.query.created_at_max as string,
//       page_info: req.query.page_info as string, // For Shopify pagination
//     };

//     const orders = await orderService.getOrdersFromStore(storeId, filters);
//     res.json(orders);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get single order
// router.get('/store/:storeId/:orderId', async (req: Request, res: Response) => {
//   try {
//     const { storeId, orderId } = req.params;
//     const order = await orderService.getOrder(storeId, orderId);
//     res.json(order);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Fulfill order
// router.post('/store/:storeId/:orderId/fulfill', async (req: Request, res: Response) => {
//   try {
//     const { storeId, orderId } = req.params;
//     const fulfillmentData = req.body;

//     const fulfillment = await orderService.fulfillOrder(storeId, orderId, fulfillmentData);
//     res.json(fulfillment);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Cancel order
// router.post('/store/:storeId/:orderId/cancel', async (req: Request, res: Response) => {
//   try {
//     const { storeId, orderId } = req.params;
//     const { reason, restock } = req.body;

//     const order = await orderService.cancelOrder(storeId, orderId, reason, restock);
//     res.json(order);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Update order
// router.put('/store/:storeId/:orderId', async (req: Request, res: Response) => {
//   try {
//     const { storeId, orderId } = req.params;
//     const updateData = req.body;

//     const order = await orderService.updateOrder(storeId, orderId, updateData);
//     res.json(order);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Create refund
// router.post('/store/:storeId/:orderId/refund', async (req: Request, res: Response) => {
//   try {
//     const { storeId, orderId } = req.params;
//     const refundData = req.body;

//     const refund = await orderService.createRefund(storeId, orderId, refundData);
//     res.json(refund);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });



import express, { Response } from 'express';
import { orderService } from '../services/order.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prismma'; // FIXED: Changed from 'prismma' to 'prisma'

const router = express.Router();

// Protect all order routes
router.use(authMiddleware);

// Get orders from all stores
router.get('/all', async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      status: req.query.status as any,
      financial_status: req.query.financial_status as string,
      fulfillment_status: req.query.fulfillment_status as string,
      created_at_min: req.query.created_at_min as string,
      created_at_max: req.query.created_at_max as string,
      page_info: req.query.page_info as string,
    };

    const allOrders = await orderService.getOrdersFromAllStores(filters);
    res.json(allOrders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders from specific store
router.get('/store/:storeId', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const filters = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      status: req.query.status as any,
      financial_status: req.query.financial_status as string,
      fulfillment_status: req.query.fulfillment_status as string,
      created_at_min: req.query.created_at_min as string,
      created_at_max: req.query.created_at_max as string,
      page_info: req.query.page_info as string,
    };

    const orders = await orderService.getOrdersFromStore(storeId, filters);
    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching store orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/store/:storeId/:orderId', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderId } = req.params;
    const order = await orderService.getOrder(storeId, orderId);
    res.json(order);
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fulfill order
router.post('/store/:storeId/:orderId/fulfill', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderId } = req.params;
    const fulfillmentData = req.body;

    const fulfillment = await orderService.fulfillOrder(storeId, orderId, fulfillmentData);
    res.json(fulfillment);
  } catch (error: any) {
    console.error('Error fulfilling order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel order
router.post('/store/:storeId/:orderId/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderId } = req.params;
    const { reason, restock } = req.body;

    const order = await orderService.cancelOrder(storeId, orderId, reason, restock);
    res.json(order);
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order
router.put('/store/:storeId/:orderId', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderId } = req.params;
    const updateData = req.body;

    const order = await orderService.updateOrder(storeId, orderId, updateData);
    res.json(order);
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create refund
router.post('/store/:storeId/:orderId/refund', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderId } = req.params;
    const refundData = req.body;

    const refund = await orderService.createRefund(storeId, orderId, refundData);
    res.json(refund);
  } catch (error: any) {
    console.error('Error creating refund:', error);
    res.status(500).json({ error: error.message });
  }
});

// Duplicate order
router.post('/store/:storeId/:orderId/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify user owns this store
    const store = await prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const draftOrder = await orderService.duplicateOrder(storeId, orderId);
    res.json({ success: true, draftOrder });
  } catch (error: any) {
    console.error('Error duplicating order:', error);
    res.status(500).json({ error: 'Failed to duplicate order', details: error.message });
  }
});

// Create new order
router.post('/store/:storeId/create', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const userId = req.user?.userId;
    const orderData = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const draftOrder = await orderService.createOrder(storeId, orderData);
    
    // FIXED: Return 'draftOrder' to match frontend expectation
    res.json({ success: true, draftOrder });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Add note to order
router.post('/store/:storeId/:orderId/note', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderId } = req.params;
    const { note, isCustomerNote } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!note || note.trim() === '') {
      res.status(400).json({ error: 'Note is required' });
      return;
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const result = await orderService.addNote(storeId, orderId, note, isCustomerNote || false);
    res.json(result);
  } catch (error: any) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note', details: error.message });
  }
});

// Add line items to order
router.post('/store/:storeId/:orderId/items/add', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderId } = req.params;
    const { items } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required' });
      return;
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const result = await orderService.addLineItems(storeId, orderId, items);
    res.json(result);
  } catch (error: any) {
    console.error('Error adding line items:', error);
    res.status(500).json({ error: 'Failed to add line items', details: error.message });
  }
});

// Remove line items from order
router.post('/store/:storeId/:orderId/items/remove', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderId } = req.params;
    const { lineItemIds } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!lineItemIds || !Array.isArray(lineItemIds) || lineItemIds.length === 0) {
      res.status(400).json({ error: 'Line item IDs array is required' });
      return;
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const result = await orderService.removeLineItems(storeId, orderId, lineItemIds);
    res.json(result);
  } catch (error: any) {
    console.error('Error removing line items:', error);
    res.status(500).json({ error: 'Failed to remove line items', details: error.message });
  }
});

// Bulk tag orders
router.post('/bulk/tag', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderIds, tags } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!storeId || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: 'Store ID and order IDs are required' });
      return;
    }

    if (!tags || tags.trim() === '') {
      res.status(400).json({ error: 'Tags are required' });
      return;
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const result = await orderService.bulkTagOrders(storeId, orderIds, tags);
    res.json(result);
  } catch (error: any) {
    console.error('Error bulk tagging orders:', error);
    res.status(500).json({ error: 'Failed to bulk tag orders', details: error.message });
  }
});

// Export orders to CSV
router.post('/export', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, orderIds } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!storeId || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: 'Store ID and order IDs are required' });
      return;
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const result = await orderService.exportOrdersToCSV(storeId, orderIds);
    res.json(result);
  } catch (error: any) {
    console.error('Error exporting orders:', error);
    res.status(500).json({ error: 'Failed to export orders', details: error.message });
  }
});

export default router;