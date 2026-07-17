export interface Store {
  id: string;
  shopDomain: string;
  storeName: string;
  email: string | null;
  currency: string | null;
  timezone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  closed_at: string | null;
  currency: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  financial_status: string;
  fulfillment_status: string | null;
  tags: string | null;
  note: string | null;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
  shipping_address: {
    address1: string;
    address2: string | null;
    city: string;
    province: string | null;
    country: string;
    zip: string;
  } | null;
}

export interface OrdersResponse {
  success?: boolean;
  storeId: string;
  storeName: string;
  orders: ShopifyOrder[];
  pageInfo?: {
    hasNext: boolean;
    hasPrevious: boolean;
    nextPageInfo: string | null;
    previousPageInfo: string | null;
  };
}

export interface OrderFilters {
  status?: 'any' | 'open' | 'closed' | 'cancelled';
  financial_status?: string;
  fulfillment_status?: string;
  created_at_min?: string;
  created_at_max?: string;
  limit?: number;
  page_info?: string;
}