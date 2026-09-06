// Admin Helper Functions
export const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
};

export const formatDate = (dateString: string | Date, options?: { time?: boolean }) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(options?.time && {
      hour: '2-digit',
      minute: '2-digit',
    }),
  } as Intl.DateTimeFormatOptions);
};

export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    placed: '#f59e0b',
    confirmed: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444',
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    active: '#10b981',
    inactive: '#6b7280',
  };
  return colors[status?.toLowerCase()] || '#6b7280';
};

export const getStatusBg = (status: string) => {
  const colors: Record<string, string> = {
    placed: '#fef3c7',
    confirmed: '#dbeafe',
    shipped: '#ede9fe',
    delivered: '#d1fae5',
    cancelled: '#fee2e2',
    pending: '#fef3c7',
    approved: '#d1fae5',
    rejected: '#fee2e2',
    active: '#d1fae5',
    inactive: '#f3f4f6',
  };
  return colors[status?.toLowerCase()] || '#f3f4f6';
};

export const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const truncateText = (text: string, maxLength: number = 100) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const ORDER_STATUSES = [
  { value: 'placed', label: 'Placed', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'confirmed', label: 'Confirmed', color: '#3b82f6', bg: '#dbeafe' },
  { value: 'shipped', label: 'Shipped', color: '#8b5cf6', bg: '#ede9fe' },
  { value: 'delivered', label: 'Delivered', color: '#10b981', bg: '#d1fae5' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444', bg: '#fee2e2' },
];

export const REVIEW_STATUSES = [
  { value: 0, label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
  { value: 1, label: 'Approved', color: '#10b981', bg: '#d1fae5' },
  { value: 2, label: 'Rejected', color: '#ef4444', bg: '#fee2e2' },
];

export const TESTIMONIAL_STATUSES = [
  { value: 1, label: 'Active', color: '#10b981', bg: '#d1fae5' },
  { value: 0, label: 'Inactive', color: '#6b7280', bg: '#f3f4f6' },
];

export const RATINGS = [
  { value: 5, label: '★★★★★ (5 stars)', stars: 5 },
  { value: 4, label: '★★★★☆ (4 stars)', stars: 4 },
  { value: 3, label: '★★★☆☆ (3 stars)', stars: 3 },
  { value: 2, label: '★★☆☆☆ (2 stars)', stars: 2 },
  { value: 1, label: '★☆☆☆☆ (1 star)', stars: 1 },
];

export const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (i < rating ? '★' : '☆')).join('');
};

export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

// Pagination helper
export const getPaginationRange = (currentPage: number, totalPages: number, sideLength: number = 2) => {
  const pages: (number | string)[] = [];

  // First page
  pages.push(1);

  // Left dots
  if (currentPage - sideLength > 2) {
    pages.push('...');
  }

  // Left side
  for (let i = Math.max(2, currentPage - sideLength); i < currentPage; i++) {
    pages.push(i);
  }

  // Current page
  if (currentPage !== 1 && currentPage !== totalPages) {
    pages.push(currentPage);
  }

  // Right side
  for (let i = currentPage + 1; i <= Math.min(totalPages - 1, currentPage + sideLength); i++) {
    pages.push(i);
  }

  // Right dots
  if (currentPage + sideLength < totalPages - 1) {
    pages.push('...');
  }

  // Last page
  if (totalPages !== 1) {
    pages.push(totalPages);
  }

  return pages;
};

// API error handler
export const handleApiError = (error: any) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

// Local storage helpers
export const setAdminPreference = (key: string, value: any) => {
  try {
    localStorage.setItem(`admin_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save preference:', error);
  }
};

export const getAdminPreference = (key: string, defaultValue?: any) => {
  try {
    const item = localStorage.getItem(`admin_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to get preference:', error);
    return defaultValue;
  }
};
