import { useAuth } from "./useAuth";

export const useApi = () => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase || "http://localhost:3000";
  const { getIdToken, signOut } = useAuth();

  const fetchApi = async <T>(
    endpoint: string,
    options: Record<string, any> = {}
  ): Promise<T> => {
    const url = `${baseUrl.replace(/\/$/, "")}${endpoint}`;

    // Retrieve the current Cognito ID token
    const token = await getIdToken();

    if (!token && import.meta.client) {
      signOut();
      throw new Error("Session expired. Please log in again.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await $fetch<T>(url, {
        ...options,
        headers
      });
      return response;
    } catch (error: any) {
      // Handle authentication failures and network errors
      const status = error?.response?.status || error?.status || error?.statusCode;
      if (status === 401 || error?.name === "FetchError" || !status) {
        if (import.meta.client && (status === 401 || !token)) {
          signOut();
          throw new Error("Session expired. Please log in again.");
        }
      }

      const message =
        error.data?.error || error.message || "An unexpected error occurred";
      throw new Error(message);
    }
  };

  return {
    getMonitors: () => fetchApi<{ monitors: any[]; count: number }>("/monitors"),
    getMonitor: (id: string) => fetchApi<{ monitor: any }>(`/monitors/${id}`),
    createMonitor: (data: {
      name: string;
      url: string;
      method?: string;
      interval?: number;
      timeout?: number;
    }) =>
      fetchApi<{ monitor: any }>("/monitors", {
        method: "POST",
        body: data
      }),
    updateMonitor: (
      id: string,
      data: {
        name?: string;
        url?: string;
        method?: string;
        interval?: number;
        timeout?: number;
        enabled?: boolean;
      }
    ) =>
      fetchApi<{ monitor: any }>(`/monitors/${id}`, {
        method: "PATCH",
        body: data
      }),
    deleteMonitor: (id: string) =>
      fetchApi<{ message: string; monitorId: string }>(`/monitors/${id}`, {
        method: "DELETE"
      }),
    triggerCheck: (id: string) =>
      fetchApi<{ monitor: any; checkResult: any }>(`/monitors/${id}/check`, {
        method: "POST"
      }),
    getHistory: (id: string, limit: number = 50, nextToken?: string) => {
      const query = new URLSearchParams({ limit: String(limit) });
      if (nextToken) query.append("nextToken", nextToken);
      return fetchApi<{ items: any[]; nextToken?: string }>(
        `/monitors/${id}/checks?${query.toString()}`
      );
    },
    getIncidents: (id: string) =>
      fetchApi<{ incidents: any[] }>(`/monitors/${id}/incidents`),
    getStats: (id: string) => fetchApi<any>(`/monitors/${id}/stats`)
  };
};
