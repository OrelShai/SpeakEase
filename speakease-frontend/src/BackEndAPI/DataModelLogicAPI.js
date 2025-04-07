import { jwtDecode } from "jwt-decode";

// Configure your API base URL
const API_BASE_URL = "http://127.0.0.1:5000/api"; // Updated to match existing calls

// Token-related functions
const getToken = () => localStorage.getItem("token");

const setToken = (token) => {
  if (token) {
    localStorage.setItem("token", token);
  }
};

const removeToken = () => {
  localStorage.removeItem("token");
};

const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const decodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired (with 30 seconds buffer)
    return decodedToken.exp < currentTime + 30;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
};

const getUserInfo = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const decodedToken = jwtDecode(token);
    return {
      username: decodedToken.sub || decodedToken.username,
      // Add other user properties as needed
    };
  } catch (error) {
    console.error("Error decoding token:", error);
    removeToken();
    return null;
  }
};

// API request helper with automatic token handling
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  // Check token expiration and try to refresh if needed
  if (token && isTokenExpired(token) && endpoint !== "/auth/refresh") {
    const refreshed = await refreshToken();
    if (!refreshed) {
      // If refresh failed, redirect to login
      removeToken();
      window.location.href = "/login";
      return null;
    }
  }
  
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (response.status === 401 && endpoint !== "/auth/refresh") {
      // Unauthorized - token invalid or expired
      removeToken();
      window.location.href = "/login";
      return null;
    }
    
    return response;
  } catch (error) {
    console.error(`API request error (${endpoint}):`, error);
    throw error;
  }
};

// Authentication functions
const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      setToken(data.access_token);
      return { success: true, user: getUserInfo() };
    } else {
      return { success: false, error: data.message || "Login failed" };
    }
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Network or server error" };
  }
};

const register = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, message: data.message || "Registration successful" };
    } else {
      return { success: false, error: data.error || "Registration failed" };
    }
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "Network or server error" };
  }
};

const logout = () => {
  removeToken();
  // Additional logout logic if needed
  return { success: true };
};

const refreshToken = async () => {
  try {
    const token = getToken();
    if (!token) return false;
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      setToken(data.access_token);
      return true;
    } else {
      removeToken();
      return false;
    }
  } catch (error) {
    console.error("Token refresh error:", error);
    removeToken();
    return false;
  }
};

const validateToken = async () => {
  const token = getToken();
  if (!token) return false;
  
  // Check if token is expired
  if (isTokenExpired(token)) {
    // Try to refresh the token
    return await refreshToken();
  }
  
  return true;
};

// User Profile Management
const getUserProfile = async () => {
  try {
    const response = await apiRequest('/users/me', {
      method: 'GET'
    });
    
    if (!response) return null;
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Failed to fetch user profile" };
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { success: false, error: "Network or server error" };
  }
};

const updateUserProfile = async (username, userData) => {
  try {
    const response = await apiRequest(`/users/${username}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    
    if (!response) return null;
    
    const data = await response.json();
    
    if (response.ok) {
      // If we get a new token, store it
      if (data.new_token) {
        setToken(data.new_token);
      }
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Failed to update profile" };
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: "Network or server error" };
  }
};

// Scenario Management
const createCustomScenario = async (scenarioData) => {
  try {
    const response = await apiRequest('/scenarios', {
      method: 'POST',
      body: JSON.stringify(scenarioData)
    });
    
    if (!response) return null;
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Failed to create scenario" };
    }
  } catch (error) {
    console.error("Error creating scenario:", error);
    return { success: false, error: "Network or server error" };
  }
};

const getUserScenarios = async () => {
  try {
    const response = await apiRequest('/scenarios', {
      method: 'GET'
    });
    
    if (!response) return null;
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Failed to fetch scenarios" };
    }
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return { success: false, error: "Network or server error" };
  }
};

const getUserHistory = async () => {
  try {
    const response = await apiRequest('/users/history', {
      method: 'GET'
    });
    
    if (!response) return null;
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || "Failed to fetch user history" };
    }
  } catch (error) {
    console.error("Error fetching user history:", error);
    return { success: false, error: "Network or server error" };
  }
};

// Form validation
const validatePasswordComplexity = (password) => {
  // Check minimum length (8 characters)
  if (password.length < 8) return false;
  
  // Check for at least one number
  if (!/\d/.test(password)) return false;
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)) return false;
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  
  return true;
};

const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

// Export all functions
export {
  login,
  register,
  logout,
  validateToken,
  getUserInfo,
  getToken,
  apiRequest,
  refreshToken,
  getUserProfile,
  updateUserProfile,
  createCustomScenario,
  getUserScenarios,
  getUserHistory,
  validatePasswordComplexity,
  validateEmail
};
