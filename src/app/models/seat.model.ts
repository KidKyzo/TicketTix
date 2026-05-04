/**
 * Seat Model
 */
export interface Seat {
  _id?: string;
  id?: string; // Frontend alias for _id
  event_id: string;
  seat_number: string; // Format: A1-A300
  category: 'Lower Foyer' | 'Balcony';
  status: 'available' | 'sold';
  price: number;
  user_id?: string | null;
  transaction_id?: string | null;
  sold_at?: Date | null;
}

/**
 * Seat Selection (for cart/checkout)
 */
export interface SeatSelection {
  seat_id: string;
  seat_number: string;
  category: 'Lower Foyer' | 'Balcony';
  price: number;
}
