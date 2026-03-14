// Common types used throughout the application

export interface Product {
  id: number | string;
  handle?: string;                    // URL-friendly slug
  sku?: string;                       // Stock keeping unit
  title: string;
  description?: string;
  price: number;
  regular_price?: number;             // Original/MRP price
  discounted_price?: number;
  image_url?: string;                 // Main product image
  images?: string[];
  image?: string;
  category?: string;
  in_stock?: boolean;
  quantity?: number;
  rating?: number;
  reviews?: Review[];                 // Associated reviews
  view_count?: number;
  ordered_count_30_days?: number;
  directions?: string;
  benefits?: string;
  ingredients?: string;
  note?: string;
  featured_order?: number;
  related_products?: number[];
  created_at?: string;
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
  password?: string;                  // Only used server-side
  role?: number;                      // 1 = customer, 2 = admin, etc.
  image?: string;                     // Profile image
  address?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Order {
  id: number | string;
  user_id?: number | string;
  items: CartItem[] | any;            // JSONB from database
  total_amount: number;
  transaction_price?: number;
  shipping_data?: any;                // JSONB with address info
  payment_method?: string;            // 'cod' or 'online'
  status: string;                     // placed, confirmed, shipped, delivered, cancelled
  tracking_id?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Review {
  id: number | string;
  product_id: number | string;
  rating: number;
  reviewer_name?: string;             // Name of reviewer
  review_text?: string;               // Review content
  status?: number;                    // 0 = pending, 1 = approved, 2 = rejected
  date?: string;                      // Legacy field
  created_at?: string;
  [key: string]: any;
}

export interface Category {
  id: number | string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Blog {
  id: number | string;
  title: string;
  handle?: string;               // slug for URL
  excerpt?: string;
  content?: string;             // markdown or HTML
  author?: string;
  status?: number;              // 0 = draft/hidden, 1 = published
  image_url?: string;
  images?: string[];
  related_posts?: number[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Testimonial {
  id?: number | string;
  name: string;
  designation?: string;
  comment: string;
  image?: string;
  rating: number;
  status: 'active' | 'inactive';
  created_at?: string;
}
