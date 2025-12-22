// Common types used throughout the application

export interface Product {
  id: number | string;
  title: string;
  description?: string;
  price: number;
  discounted_price?: number;
  images?: string[];
  image?: string;
  category?: string;
  in_stock?: boolean;
  quantity?: number;
  rating?: number;
  reviews?: number;
  [key: string]: any;
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: string;
}

export interface User {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

export interface Order {
  id: number | string;
  user_id: number | string;
  items: CartItem[];
  total: number;
  status: string;
  created_at: string;
  [key: string]: any;
}

export interface Review {
  id: number | string;
  product_id: number | string;
  user_id: number | string;
  rating: number;
  comment: string;
  created_at: string;
  [key: string]: any;
}

export interface Category {
  id: number | string;
  name: string;
  slug: string;
  image?: string;
  [key: string]: any;
}
