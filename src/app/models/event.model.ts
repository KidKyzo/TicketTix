/**
 * Event Model
 */
export interface Event {
  _id?: string;
  id?: string; // Frontend alias for _id
  event_name: string;
  title?: string; // Frontend alias for event_name
  organizer_id: string;
  organizer?: {
    _id: string;
    organizer_name: string;
    organization?: string;
  };
  description?: string;
  date: string; // Format: YYYY-MM-DD
  time?: string; // Format: HH:MM
  location?: string;
  image?: string; // URL to event image
  price_lower_foyer: number;
  price_balcony: number;
  discounts?: EventDiscount[];
  created_at?: Date;
}

/**
 * Discount Code
 */
export interface EventDiscount {
  code: string;
  discount: number; // Percentage (0-100)
}

/**
 * Create Event DTO (Data Transfer Object)
 */
export interface CreateEventDto {
  title: string; // Maps to event_name
  description?: string;
  date: string;
  time?: string;
  location?: string;
  image?: string;
  price_lower_foyer: number;
  price_balcony: number;
  discounts?: EventDiscount[];
}

/**
 * Update Event DTO
 */
export interface UpdateEventDto extends Partial<CreateEventDto> {}
