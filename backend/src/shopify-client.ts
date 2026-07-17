// import axios from 'axios';

// class ShopifyClientManager {
//   createRestClient(shopDomain: string, accessToken: string) {
//     const baseURL = `https://${shopDomain}/admin/api/2024-01`;
    
//     const client = axios.create({
//       baseURL,
//       headers: {
//         'X-Shopify-Access-Token': accessToken,
//         'Content-Type': 'application/json',
//       },
//     });

//     // Helper to parse Shopify's Link header for pagination
//     const parseLinkHeader = (linkHeader: string | undefined) => {
//       if (!linkHeader) return {};
      
//       const links: any = {};
//       const parts = linkHeader.split(',');
      
//       parts.forEach(part => {
//         const section = part.split(';');
//         if (section.length === 2) {
//           const url = section[0].replace(/<(.*)>/, '$1').trim();
//           const name = section[1].replace(/rel="(.*)"/, '$1').trim();
          
//           // Extract page_info parameter from URL
//           const pageInfoMatch = url.match(/page_info=([^&]+)/);
//           if (pageInfoMatch) {
//             links[name] = pageInfoMatch[1];
//           }
//         }
//       });
      
//       return links;
//     };

//     // Return client with Shopify SDK-like interface
//     return {
//       get: async ({ path, query = {} }: { path: string; query?: any }) => {
//         const response = await client.get(`/${path}.json`, { params: query });
//         const pageInfo = parseLinkHeader(response.headers['link']);
        
//         return { 
//           body: response.data,
//           pageInfo: {
//             hasNext: !!pageInfo.next,
//             hasPrevious: !!pageInfo.previous,
//             nextPageInfo: pageInfo.next,
//             previousPageInfo: pageInfo.previous,
//           }
//         };
//       },
//       post: async ({ path, data }: { path: string; data?: any }) => {
//         const response = await client.post(`/${path}.json`, data);
//         return { body: response.data };
//       },
//       put: async ({ path, data }: { path: string; data?: any }) => {
//         const response = await client.put(`/${path}.json`, data);
//         return { body: response.data };
//       },
//       delete: async ({ path }: { path: string }) => {
//         const response = await client.delete(`/${path}.json`);
//         return { body: response.data };
//       },
//     };
//   }

//   createGraphQLClient(shopDomain: string, accessToken: string) {
//     const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`;
    
//     return {
//       query: async ({ data }: { data: string }) => {
//         const response = await axios.post(url, { query: data }, {
//           headers: {
//             'X-Shopify-Access-Token': accessToken,
//             'Content-Type': 'application/json',
//           },
//         });
//         return { body: response.data };
//       },
//     };
//   }
// }

// export const clientManager = new ShopifyClientManager();


import axios, { AxiosInstance } from 'axios';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 500): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable =
        err.code === 'ECONNRESET' ||
        err.code === 'ECONNABORTED' ||
        err.code === 'ETIMEDOUT' ||
        err.response?.status === 429 ||
        err.response?.status >= 500;

      if (!isRetryable || attempt === retries) throw err;

      const delay = baseDelay * 2 ** attempt + Math.random() * 200;
      console.warn(`[Shopify] Attempt ${attempt + 1} failed (${err.code ?? err.response?.status}), retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Unreachable');
}

class ShopifyClientManager {
  private createAxiosInstance(shopDomain: string, accessToken: string): AxiosInstance {
    return axios.create({
      baseURL: `https://${shopDomain}/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
      // Disable keep-alive so stale sockets are never reused
      httpAgent:  new (require('http').Agent)({ keepAlive: false }),
      httpsAgent: new (require('https').Agent)({ keepAlive: false }),
    });
  }

  private parseLinkHeader(linkHeader: string | undefined) {
    if (!linkHeader) return {};
    const links: Record<string, string> = {};
    linkHeader.split(',').forEach(part => {
      const [urlPart, relPart] = part.split(';');
      if (!urlPart || !relPart) return;
      const url  = urlPart.replace(/<(.*)>/, '$1').trim();
      const name = relPart.replace(/rel="(.*)"/, '$1').trim();
      const match = url.match(/page_info=([^&]+)/);
      if (match) links[name] = match[1];
    });
    return links;
  }

  createRestClient(shopDomain: string, accessToken: string) {
    const client = this.createAxiosInstance(shopDomain, accessToken);

    return {
      get: async ({ path, query = {} }: { path: string; query?: any }) => {
        const response = await withRetry(() =>
          client.get(`/${path}.json`, { params: query })
        );
        const pageInfo = this.parseLinkHeader(response.headers['link']);
        return {
          body: response.data,
          pageInfo: {
            hasNext:          !!pageInfo.next,
            hasPrevious:      !!pageInfo.previous,
            nextPageInfo:     pageInfo.next,
            previousPageInfo: pageInfo.previous,
          },
        };
      },
      post: async ({ path, data }: { path: string; data?: any }) => {
        const response = await withRetry(() =>
          client.post(`/${path}.json`, data)
        );
        return { body: response.data };
      },
      put: async ({ path, data }: { path: string; data?: any }) => {
        const response = await withRetry(() =>
          client.put(`/${path}.json`, data)
        );
        return { body: response.data };
      },
      delete: async ({ path }: { path: string }) => {
        const response = await withRetry(() =>
          client.delete(`/${path}.json`)
        );
        return { body: response.data };
      },
    };
  }

  createGraphQLClient(shopDomain: string, accessToken: string) {
    const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`;
    const headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };

    return {
      query: async ({ data }: { data: string }) => {
        const response = await withRetry(() =>
          axios.post(url, { query: data }, { headers, timeout: 30_000 })
        );
        return { body: response.data };
      },
    };
  }
}

export const clientManager = new ShopifyClientManager();