const API_URL = 'http://localhost:3000/api/v1';
let authToken = '';

export const setAuthToken = (token: string) => {
  authToken = token;
};

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };
};

export const requestOtp = async (phoneNumber: string) => {
  const res = await fetch(`${API_URL}/auth/artisan/otp/request`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ phoneNumber })
  });
  return res.json();
};

export const verifyOtp = async (phoneNumber: string, code: string) => {
  const res = await fetch(`${API_URL}/auth/artisan/otp/verify`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ phoneNumber, code })
  });
  const data = await res.json();
  if (data.accessToken) setAuthToken(data.accessToken);
  return data;
};

export const getMyProducts = async () => {
  const res = await fetch(`${API_URL}/products/mine`, {
    headers: getHeaders(),
  });
  return res.json();
};

