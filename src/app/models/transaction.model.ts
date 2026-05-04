/**
 * Transaction Model
 */
export interface Transaction {
  _id?: string;
  id?: string; // Frontend alias for _id
  user_id: string;
  event_id: string;
  seats: string[]; // Array of seat IDs
  total_amount: number;
  discount_code?: string;
  discount_amount?: number;
  final_amount: number;
  payment_method: 'midtrans' | 'manual';
  payment_status: 'pending' | 'success' | 'failed';
  midtrans_order_id?: string;
  midtrans_transaction_id?: string;
  created_at?: Date;
}

/**
 * Payment Request
 */
export interface PaymentRequest {
  event_id: string;
  seat_ids: string[];
  discount_code?: string;
  user_email: string;
  user_name: string;
}

/**
 * Payment Response (from Midtrans)
 */
export interface PaymentResponse {
  success: boolean;
  transaction?: Transaction;
  midtrans_redirect_url?: string;
  message?: string;
}
