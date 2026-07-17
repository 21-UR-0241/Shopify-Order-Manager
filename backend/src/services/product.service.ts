import { storeService } from './store.service';

class ProductService {
  /**
   * Get all products from a Shopify store
   * @param storeId - The store ID
   * @returns Array of products with variants
   */
  async getProductsFromStore(storeId: string) {
    const client = await storeService.getClientForStore(storeId);
    const store = await storeService.getStore(storeId);

    try {
      let allProducts: any[] = [];
      let hasNextPage = true;
      let pageInfo: string | undefined;

      // Fetch all products (handle pagination)
      while (hasNextPage) {
        const query: any = {
          limit: '250', // Max limit per request
          fields: 'id,title,variants,images,status',
        };

        if (pageInfo) {
          query.page_info = pageInfo;
        }

        const response = await client.get({
          path: 'products',
          query,
        });

        const products = response.body.products || [];
        allProducts = allProducts.concat(products);

        // Check if there are more pages
        hasNextPage = response.pageInfo?.hasNext || false;
        pageInfo = response.pageInfo?.nextPageInfo;

        // Safety limit - stop after 1000 products
        if (allProducts.length >= 1000) {
          break;
        }
      }

      // Format products for frontend
      const formattedProducts = allProducts
        .filter((product: any) => product.status === 'active') // Only active products
        .map((product: any) => ({
          id: product.id.toString(),
          title: product.title,
          variants: (product.variants || []).map((variant: any) => ({
            id: variant.id.toString(),
            title: variant.title,
            price: variant.price,
            sku: variant.sku || '',
            inventory_quantity: variant.inventory_quantity || 0,
          })),
          image: product.images && product.images.length > 0
            ? { src: product.images[0].src }
            : null,
        }));

      return {
        storeId,
        storeName: store?.storeName,
        shopDomain: store?.shopDomain,
        products: formattedProducts,
        totalCount: formattedProducts.length,
      };
    } catch (error: any) {
      console.error(`Error fetching products from ${store?.shopDomain}:`, error.message);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }
}

export const productService = new ProductService();