/**
 * Generic API Response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Auth Response
 */
export interface AuthResponse {
  success: boolean;
  user?: any; // Can be User or Organizer
  message?: string;
}

/**
 * Events Response
 */
export interface EventsResponse {
  success: boolean;
  events: any[];
}

/**
 * Event Details Response
 */
export interface EventDetailsResponse {
  success: boolean;
  event: any;
  seats: any[];
}

/**
 * Admin Stats Response
 */
export interface AdminStatsResponse {
  success: boolean;
  stats: {
    total_users?: number;
    total_events?: number;
    total_organizers?: number;
    pending_applications?: number;
    total_transactions?: number;
    total_revenue?: number;
  };
}
