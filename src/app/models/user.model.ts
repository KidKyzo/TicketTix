/**
 * User Model
 * Represents both Attendees and Admins
 */
export interface User {
  _id?: string;
  id?: string; // Frontend alias for _id
  full_name: string;
  email: string;
  password?: string; // Optional in responses
  role: 'attendee' | 'admin';
  created_at?: Date;
}

/**
 * Attendee-specific interface (extends User)
 */
export interface Attendee extends User {
  role: 'attendee';
}

/**
 * Admin-specific interface (extends User)
 */
export interface Admin extends User {
  role: 'admin';
}
