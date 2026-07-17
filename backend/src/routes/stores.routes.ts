

import express, { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { productService } from '../services/product.service'; // ← ADD THIS IMPORT

const router: Router = express.Router();

// Protect all store routes
router.use(authMiddleware);

// GET /api/stores - Get all stores for authenticated user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stores = await prisma.store.findMany({
      where: { userId },
      select: {
        id: true,
        shopDomain: true,
        storeName: true,
        email: true,
        currency: true,
        timezone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ stores, count: stores.length });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// GET /api/stores/:id - Get single store
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const store = await prisma.store.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    res.json({ store });
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

// ========================================
// ✨ NEW: GET /api/stores/:id/products
// Get products from a specific store
// ========================================
router.get('/:id/products', async (req: AuthRequest, res) => {
  try {
    const { id: storeId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
      return;
    }

    // Verify user owns this store
    const store = await prisma.store.findFirst({
      where: { 
        id: storeId, 
        userId,
        isActive: true 
      },
    });

    if (!store) {
      res.status(404).json({ 
        success: false,
        error: 'Store not found or access denied' 
      });
      return;
    }

    // Fetch products from Shopify
    const productsData = await productService.getProductsFromStore(storeId);

    res.json({
      success: true,
      ...productsData,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to fetch products' 
    });
  }
});
// ========================================

// POST /api/stores - Create a new store
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { shopDomain, accessToken, storeName, email, currency, timezone } = req.body;

    if (!shopDomain || !accessToken || !storeName) {
      res.status(400).json({ 
        error: 'Shop domain, access token, and store name are required' 
      });
      return;
    }

    // Check if store already exists
    const existingStore = await prisma.store.findUnique({
      where: { shopDomain },
    });

    if (existingStore) {
      res.status(400).json({ error: 'Store with this domain already exists' });
      return;
    }

    const store = await prisma.store.create({
      data: {
        userId,
        shopDomain,
        accessToken,
        storeName,
        email,
        currency,
        timezone,
      },
    });

    res.status(201).json({ store });
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// PUT /api/stores/:id - Update store
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { storeName, email, currency, timezone, isActive } = req.body;

    // Verify ownership
    const existingStore = await prisma.store.findFirst({
      where: { id, userId },
    });

    if (!existingStore) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const store = await prisma.store.update({
      where: { id },
      data: {
        ...(storeName && { storeName }),
        ...(email !== undefined && { email }),
        ...(currency && { currency }),
        ...(timezone && { timezone }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ store });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// DELETE /api/stores/:id - Delete store
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const store = await prisma.store.findFirst({
      where: { id, userId },
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    await prisma.store.delete({
      where: { id },
    });

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

export default router;