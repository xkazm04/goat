const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Create a structured error with status information
        const error = new Error(errorData.detail || `HTTP error! status: ${response.status}`) as any;
        error.status = response.status;
        error.statusText = response.statusText;
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        };
        throw error;
      }

      return response.json();
    } catch (error: any) {
      // If the error already has a status (from above), rethrow it
      if (error.status) {
        throw error;
      }

      // Network errors (fetch failures)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Failed to connect to server') as any;
        networkError.name = 'NetworkError';
        networkError.originalError = error;
        throw networkError;
      }

      // Other errors
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();