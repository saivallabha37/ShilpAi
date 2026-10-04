const API_URL = 'http://localhost:3000/api/v1';
let authToken = '';

export const setAuthToken = (token: string) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const getHeaders = (isMultipart = false) => {
  const headers: Record<string, string> = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

// ---------------- AUTH ----------------
export const requestOtp = async (phoneNumber: string) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${API_URL}/auth/artisan/otp/request`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phoneNumber }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await res.json();
  } catch (e) {
    return { message: 'OTP sent (mocked test code: 123456)', testCode: '123456' };
  }
};

export const verifyOtp = async (phoneNumber: string, code: string) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${API_URL}/auth/artisan/otp/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phoneNumber, code }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (data?.accessToken) setAuthToken(data.accessToken);
    return data;
  } catch (e) {
    const mockToken = 'mock-demo-artisan-jwt';
    setAuthToken(mockToken);
    return {
      accessToken: mockToken,
      user: { id: 'artisan-demo-id', role: 'ARTISAN', status: 'active', name: 'Rameshwar Prajapati' }
    };
  }
};

export const loginBuyer = async (email: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/buyer/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.accessToken) setAuthToken(data.accessToken);
  return data;
};

export const registerBuyer = async (payload: { email: string; password: string; organizationName: string; contactName?: string }) => {
  const res = await fetch(`${API_URL}/auth/buyer/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.accessToken) setAuthToken(data.accessToken);
  return data;
};

export const getMe = async () => {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: getHeaders(),
  });
  return res.json();
};

// ---------------- PROFILES ----------------
export const getCraftCategories = async () => {
  const res = await fetch(`${API_URL}/profile/craft-categories`);
  return res.json();
};

export const getMyProfile = async () => {
  const res = await fetch(`${API_URL}/profile/me`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const updateMyProfile = async (payload: {
  name: string;
  craftCategoryId: string;
  locationState: string;
  locationDistrict: string;
  bio?: string;
  photoUrl?: string;
}) => {
  const res = await fetch(`${API_URL}/profile/me`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
};

// ---------------- PRODUCTS ----------------
export const getMyProducts = async (status?: string) => {
  const url = status ? `${API_URL}/products/mine?status=${status}` : `${API_URL}/products/mine`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  return res.json();
};

export const getProductDetail = async (id: string) => {
  const res = await fetch(`${API_URL}/products/${id}`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createProduct = async (payload: {
  name: string;
  categoryId?: string;
  materials?: string;
  productionTime?: string;
  quantityAvailable?: number;
  rawDescription?: string;
}) => {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const updateProduct = async (id: string, payload: any) => {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const addProductImage = async (id: string, rawImageUrl: string) => {
  const res = await fetch(`${API_URL}/products/${id}/images`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ rawImageUrl }),
  });
  return res.json();
};

export const submitVoiceNote = async (id: string, audioUrl?: string, audioBase64?: string) => {
  const res = await fetch(`${API_URL}/products/${id}/voice`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ audioUrl, audioBase64 }),
  });
  return res.json();
};

export const submitProductForProcessing = async (id: string) => {
  const res = await fetch(`${API_URL}/products/${id}/submit`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return res.json();
};

export const publishProduct = async (id: string) => {
  const res = await fetch(`${API_URL}/products/${id}/publish`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return res.json();
};

// ---------------- MARKETPLACE & INQUIRIES ----------------
export const getMarketplaceProducts = async (filters: {
  query?: string;
  categoryId?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
} = {}) => {
  const params = new URLSearchParams();
  if (filters.query) params.append('query', filters.query);
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.state) params.append('state', filters.state);
  if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());

  const res = await fetch(`${API_URL}/products?${params.toString()}`);
  return res.json();
};

export const submitInquiry = async (payload: {
  productId: string;
  quantity?: number;
  requirements?: string;
  targetLocation?: string;
  message?: string;
}) => {
  const res = await fetch(`${API_URL}/inquiries`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const getMyInquiries = async () => {
  const res = await fetch(`${API_URL}/inquiries/mine`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const updateInquiryStatus = async (id: string, status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED') => {
  const res = await fetch(`${API_URL}/inquiries/${id}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  return res.json();
};

export const markInquiryViewed = async (id: string) => {
  const res = await fetch(`${API_URL}/inquiries/${id}/view`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  return res.json();
};
