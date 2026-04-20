import { auth } from './firebase';

const API_BASE_URL = 'http://localhost:3000';

export const apiClient = async (endpoint, options = {}) => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error("No authenticated user found");
  }

  const token = await user.getIdToken();

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Attempt to extract the error payload
    let errorMsg = `API Error: ${response.statusText}`;
    try {
      const errData = await response.json();
      errorMsg = errData.message || errorMsg;
    } catch (e) {
      // Not JSON
    }
    throw new Error(errorMsg);
  }

  // Handle No Content (204)
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export default apiClient;
