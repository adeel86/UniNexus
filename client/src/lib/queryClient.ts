import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Include dev token if available (for demo accounts)
  const devToken = localStorage.getItem('dev_token');
  if (devToken) {
    headers['Authorization'] = `Bearer ${devToken}`;
  } else {
    // Fallback to Firebase token for regular users
    try {
      const { auth } = await import('./firebase');
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Error attaching Firebase token:", e);
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Include dev token if available (for demo accounts)
    const devToken = localStorage.getItem('dev_token');
    if (devToken) {
      headers['Authorization'] = `Bearer ${devToken}`;
    } else {
      // Fallback to Firebase token for regular users
      try {
        const { auth } = await import('./firebase');
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (e) {
        console.error("Error attaching Firebase token to query:", e);
      }
    }
    
    // Build URL with query parameters
    let url = '';
    let queryParams: Record<string, string> = {};
    
    // Separate path segments from query parameters
    const lastItem = queryKey[queryKey.length - 1];
    const isLastItemParams = typeof lastItem === 'object' && lastItem !== null && !Array.isArray(lastItem);
    
    if (isLastItemParams) {
      // Last item is query params, build path from all items except the last
      const pathSegments = queryKey.slice(0, -1).filter(k => typeof k === 'string' || typeof k === 'number');
      url = pathSegments.join("/");
      queryParams = lastItem as Record<string, string>;
    } else {
      // No query params, join all segments
      const pathSegments = queryKey.filter(k => typeof k === 'string' || typeof k === 'number');
      url = pathSegments.join("/");
    }
    
    // Add query parameters if present
    if (Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
