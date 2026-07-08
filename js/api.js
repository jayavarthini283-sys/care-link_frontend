const BASE_URL = 'http://localhost:8080';

// Token Management
function saveAuth(token, email, role) {
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('user_email', email);
    localStorage.setItem('user_role', role);
}

function clearAuth() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
}

function getAuthToken() {
    return localStorage.getItem('jwt_token');
}

function getUserEmail() {
    return localStorage.getItem('user_email');
}

function getUserRole() {
    return localStorage.getItem('user_role');
}

function isAuthenticated() {
    return !!getAuthToken();
}

// API Request Wrapper
async function apiFetch(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // Set default headers
    const headers = new Headers(options.headers || {});
    
    // Append Authorization Header if token exists
    const token = getAuthToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Set Content-Type to application/json by default if body is present and not FormData
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    
    const config = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(url, config);
        
        // Handle unauthorized response (401)
        if (response.status === 401) {
            clearAuth();
            window.location.href = 'login.html';
            throw new Error('Session expired. Please login again.');
        }
        
        // Handle no content (204)
        if (response.status === 204) {
            return null;
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            return data;
        } else {
            const text = await response.text();
            if (!response.ok) {
                throw new Error(text || 'API request failed');
            }
            return text;
        }
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}

// Utility: Format Spring Boot LocalDateTime (String or Array)
function formatDateTime(dateTimeInput) {
    if (!dateTimeInput) return 'N/A';
    try {
        if (Array.isArray(dateTimeInput)) {
            const [year, month, day, hour, minute] = dateTimeInput;
            const date = new Date(year, month - 1, day, hour, minute || 0);
            return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        }
        const date = new Date(dateTimeInput);
        if (isNaN(date.getTime())) {
            // Check if it's ISO string but with space or weird format
            const parsed = Date.parse(dateTimeInput.replace(' ', 'T'));
            if (!isNaN(parsed)) {
                return new Date(parsed).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
            }
            return dateTimeInput;
        }
        return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateTimeInput;
    }
}

