
const API_BASE_URL = 'http://127.0.0.1:8000/api';
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  options.headers = { ...defaultHeaders, ...options.headers };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (error) {
    throw error;
  }
}

export async function registerUser(userData) {
  if (!userData || !userData.email || !userData.name || !userData.password || !userData.password_confirmation) {
    throw new Error("Data registrasi tidak lengkap. Pastikan semua field (email, nama, password, konfirmasi password) terisi.");
  }

  const endpoint = '/register';
  const options = {
    method: 'POST',
    body: JSON.stringify(userData),
  };
  return request(endpoint, options);
}

export async function loginUser(email, password) {
  const endpoint = '/login';
  const options = {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  };
  return request(endpoint, options);
}

export async function logoutUser(token) {
  if (!token) {
    throw new Error("Token otorisasi tidak tersedia untuk logout.");
  }
  const endpoint = '/logout';
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  return request(endpoint, options);
}

export async function getDashboardData(token) {
  if (!token) {
    throw new Error('Token otorisasi tidak tersedia untuk mengambil data dashboard.');
  }
  const endpoint = '/dashboard';
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  return request(endpoint, options);
}