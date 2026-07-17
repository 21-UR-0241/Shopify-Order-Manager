import prisma from '../db';
import { clientManager } from '../shopify-client';

export interface CreateStoreInput {
  userId: string;  // Added userId
  shopDomain: string;
  accessToken: string;
  storeName: string;
  email?: string;
  currency?: string;
  timezone?: string;
}

export interface UpdateStoreInput {
  storeName?: string;
  email?: string;
  currency?: string;
  timezone?: string;
  isActive?: boolean;
}

class StoreService {
  async getAllStores() {
    return await prisma.store.findMany({
      where: { isActive: true },
      orderBy: { storeName: 'asc' },
    });
  }

  async getStore(storeId: string) {
    return await prisma.store.findUnique({
      where: { id: storeId },
    });
  }

  async getStoreByDomain(shopDomain: string) {
    return await prisma.store.findUnique({
      where: { shopDomain },
    });
  }

  async getUserStores(userId: string) {
    return await prisma.store.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStore(data: CreateStoreInput) {
    // Verify the access token works before saving
    try {
      const client = clientManager.createRestClient(data.shopDomain, data.accessToken);
      await client.get({ path: 'shop' });
    } catch (error: any) {
      const errorMsg = error.response?.data?.errors || error.message;
      console.error('Shopify API Error:', errorMsg);
      throw new Error(`Invalid access token or shop domain. Shopify says: ${JSON.stringify(errorMsg)}`);
    }

    return await prisma.store.create({
      data: {
        userId: data.userId,  // Added userId
        shopDomain: data.shopDomain,
        accessToken: data.accessToken,
        storeName: data.storeName,
        email: data.email,
        currency: data.currency,
        timezone: data.timezone,
      },
    });
  }

  async updateStore(storeId: string, data: UpdateStoreInput) {
    return await prisma.store.update({
      where: { id: storeId },
      data,
    });
  }

  async deleteStore(storeId: string) {
    return await prisma.store.delete({
      where: { id: storeId },
    });
  }

  async getClientForStore(storeId: string) {
    const store = await this.getStore(storeId);
    if (!store) {
      throw new Error('Store not found');
    }
    if (!store.isActive) {
      throw new Error('Store is not active');
    }
    return clientManager.createRestClient(store.shopDomain, store.accessToken);
  }

  async getStoreInfo(storeId: string) {
    const client = await this.getClientForStore(storeId);
    const response = await client.get({ path: 'shop' });
    return response.body.shop;
  }
}

export const storeService = new StoreService();