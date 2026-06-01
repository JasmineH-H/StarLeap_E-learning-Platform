const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
console.log('API_BASE_URL:', API_BASE_URL);
export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include', // Include HTTP-only cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return true;
  } catch {
    return false;
  }
};

// Main authenticated request function - simplified for HTTP-only cookies
export const makeAuthenticatedRequest = async (
  url: string,
  options: RequestInit = {},
  onSessionExpired?: () => void
): Promise<Response> => {
  const makeRequest = () =>
    fetch(`${API_BASE_URL}${url}`, {
      ...options,
      credentials: 'include', // Include HTTP-only cookies
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    });

  const response = await makeRequest();

  if (response.status === 401 || response.status === 403) {
    // Token expired, try to refresh
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry the request with refreshed token
      return makeRequest();
    }
    
    // Refresh failed, notify session expired
    if (onSessionExpired) {
      onSessionExpired();
    }
    throw new Error('Session expired. Please login again.');
  }

  return response;
};