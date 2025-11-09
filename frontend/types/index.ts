// User types
export enum UserRole {
  CUSTOMER = 'customer',
  CLUB_OWNER = 'club_owner',
  BARTENDER = 'bartender',
  ADMIN = 'admin',
}

export interface User {
  id: string
  email: string
  full_name?: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface UserCreate {
  email: string
  password: string
  full_name?: string
  role: UserRole
}

export interface UserLogin {
  email: string
  password: string
}

export interface Token {
  access_token: string
  token_type: string
  user: User
}

// Club types
export interface LogoSettings {
  width: number
  height: number
  x: number
  y: number
}

export interface Club {
  id: string
  owner_id: string
  name: string
  description?: string
  address?: string
  city?: string
  formatted_address?: string
  latitude?: number
  longitude?: number
  place_id?: string
  logo_url?: string
  logo_settings?: LogoSettings | null
  cover_image_url?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface ClubCreate {
  name: string
  description?: string
  address?: string
  city?: string
  formatted_address?: string
  latitude?: number
  longitude?: number
  place_id?: string
  logo_url?: string
  logo_settings?: LogoSettings | null
  cover_image_url?: string
}

export interface ClubUpdate {
  name?: string
  description?: string
  address?: string
  city?: string
  formatted_address?: string
  latitude?: number
  longitude?: number
  place_id?: string
  logo_url?: string
  logo_settings?: LogoSettings | null
  cover_image_url?: string
  is_active?: boolean
}

export interface AddressData {
  address: string
  city?: string
  formatted_address: string
  latitude: number
  longitude: number
  place_id?: string
}

// Drink List types
export interface DrinkList {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  drink_count?: number
}

export interface DrinkListCreate {
  name: string
  description?: string
  drink_ids?: string[]
}

export interface DrinkListUpdate {
  name?: string
  description?: string
  is_active?: boolean
  drink_ids?: string[]
}

export interface DrinkListWithDrinks extends DrinkList {
  drinks: Drink[]
}

// Drink types
export interface Drink {
  id: string
  club_id: string
  name: string
  description?: string | null
  price: string
  category?: string | null
  image_url?: string | null
  brand_name?: string | null
  brand_colors?: any[] | null
  brand_fonts?: any[] | null
  is_available: boolean
  created_at: string
  updated_at?: string | null
}

export interface DrinkCreate {
  name: string
  description?: string
  price: number
  category?: string
  image_url?: string
  is_available?: boolean
}

export interface DrinkUpdate {
  name?: string
  description?: string
  price?: number
  category?: string
  image_url?: string
  is_available?: boolean
}

// Order types
export interface OrderItem {
  id: string
  drink_id: string
  drink_name?: string
  quantity: number
  price_at_purchase: string
}

export enum PaymentMethod {
  CARD = 'card',
  CASH = 'cash',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PREPARING = 'preparing',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Order {
  id: string
  customer_id: string
  club_id: string
  club_name?: string
  payment_method: PaymentMethod
  status: OrderStatus | string
  total_amount: string
  qr_code?: string
  payment_intent_id?: string
  created_at: string
  updated_at?: string
  completed_at?: string
  items: OrderItem[]
}

export interface OrderCreate {
  club_id: string
  payment_method?: PaymentMethod
  items: Array<{
    drink_id: string
    quantity: number
    price_at_purchase: string
  }>
}

export interface OrderStatusUpdate {
  status: OrderStatus
}

// Bartender types
export interface Bartender {
  id: string
  user_id: string
  club_id: string
  user_name?: string
  is_active: boolean
  created_at: string
}

export interface BartenderCreate {
  club_id: string
  email: string
  password: string
  full_name?: string
}

// API Error types
export interface ApiError {
  detail?: string
  message?: string
  error?: string
}
