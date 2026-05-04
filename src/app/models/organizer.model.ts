/**
 * Organizer Model
 */
export interface Organizer {
  _id?: string;
  id?: string; // Frontend alias for _id
  organizer_name: string;
  email: string;
  password?: string; // Optional in responses
  phone?: string;
  organization?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_first_login?: boolean;
  created_at?: Date;
}
