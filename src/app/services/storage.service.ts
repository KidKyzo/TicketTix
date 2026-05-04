import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * ApiService (formerly StorageService)
 * Handles all HTTP communication with the Node.js backend.
 * Retains 'StorageService' name to minimize refactoring impact on DI.
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private apiUrl = 'http://localhost:3000/api';
  private readonly KEYS = {
    TOKEN: 'auth_token',
    USER: 'logged_user',
    ROLE: 'user_role',
  };

  constructor(private http: HttpClient) {}

  // ==================== AUTHENTICATION ====================

  /**
   * Register Attendee
   * POST /api/auth/register-attendee
   */
  registerAttendee(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register-attendee`, {
      email: data.email,
      password: data.password,
      full_name: data.name,
    });
  }

  /**
   * Register Organizer (Application)
   * POST /api/auth/register-organizer
   */
  addOrganizerApplication(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register-organizer`, {
      email: data.email,
      organizer_name: data.name, // Mapping 'name' to 'organizer_name'
      phone: data.phone,
      organization: data.organization,
      description: data.description,
    });
  }

  /**
   * Login
   * POST /api/auth/login
   */
  login(email: string, password: string, role: string): Observable<any> {
    return this.http
      .post<{ success: boolean; user: any; message?: string }>(`${this.apiUrl}/auth/login`, {
        email,
        password,
        role,
      })
      .pipe(
        tap((response) => {
          if (response.success && response.user) {
            this.saveSession(response.user, role);
          }
        })
      );
  }

  /**
   * Change Organizer Password (First Login)
   * POST /api/auth/change-password
   */
  updateOrganizerPassword(email: string, newPassword: string): Observable<any> {
    return this.http
      .post<{ success: boolean; message?: string }>(`${this.apiUrl}/auth/change-password`, {
        email,
        newPassword,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this.logout();
          }
        })
      );
  }

  // ==================== SESSION MANAGEMENT ====================

  private saveSession(user: any, role: string): void {
    // Ensure role is stored in user object as well
    const userWithRole = { ...user, role };
    localStorage.setItem(this.KEYS.USER, JSON.stringify(userWithRole));
    localStorage.setItem(this.KEYS.ROLE, role);
  }

  getLoggedUser(): any | null {
    const userStr = localStorage.getItem(this.KEYS.USER);
    if (!userStr) return null;

    try {
      const user = JSON.parse(userStr);
      // Ensure role is always included (might be stored separately)
      if (!user.role) {
        user.role = localStorage.getItem(this.KEYS.ROLE);
      }
      return user;
    } catch {
      return null;
    }
  }

  getUserRole(): string | null {
    return localStorage.getItem(this.KEYS.ROLE);
  }

  isLoggedIn(): boolean {
    return !!this.getLoggedUser();
  }

  logout(): void {
    localStorage.removeItem(this.KEYS.USER);
    localStorage.removeItem(this.KEYS.ROLE);
    localStorage.removeItem(this.KEYS.TOKEN);
  }

  // ==================== ADMIN ====================

  /**
   * Get Pending Organizers
   * GET /api/admin/pending-organizers
   */
  getOrganizerApplications(): Observable<any[]> {
    return this.http
      .get<{ success: boolean; organizers: any[] }>(`${this.apiUrl}/admin/pending-organizers`)
      .pipe(map((res) => res.organizers));
  }

  /**
   * Approve Organizer
   * POST /api/admin/approve/:id
   */
  approveOrganizer(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/approve/${id}`, {});
  }

  /**
   * Reject Organizer
   * POST /api/admin/reject/:id
   */
  rejectOrganizer(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/reject/${id}`, {});
  }

  getPendingApplications(): Observable<any[]> {
    return this.getOrganizerApplications(); // Alias
  }

  getAdminStats(): Observable<any> {
    return this.http
      .get<{ success: boolean; stats: any }>(`${this.apiUrl}/admin/stats`)
      .pipe(map((res) => res.stats));
  }

  /**
   * Get All Events with Stats (Admin View)
   * GET /api/admin/events
   */
  getAdminEvents(): Observable<any[]> {
    return this.http.get<{ success: boolean; events: any[] }>(`${this.apiUrl}/admin/events`).pipe(
      map((res) => {
        return res.events.map((e) => ({
          ...e,
          id: e._id,
          title: e.event_name,
        }));
      })
    );
  }

  // ==================== EVENTS (PUBLIC & ORGANIZER) ====================

  /**
   * Get All Events
   * GET /api/events
   */
  getEvents(): Observable<any[]> {
    return this.http.get<{ success: boolean; events: any[] }>(`${this.apiUrl}/events`).pipe(
      map((res) => {
        // Map backend fields to frontend model if necessary
        const mapped = res.events.map((e) => ({
          ...e,
          id: e._id, // Frontend uses usually 'id'
          title: e.event_name, // Mapping event_name -> title
          // other fields map 1:1 or are handled by usage
        }));
        return mapped;
      })
    );
  }

  /**
   * Get Single Event by ID
   * GET /api/events/:id
   */
  getEventById(id: string): Observable<any> {
    return this.http
      .get<{ success: boolean; event: any; seats: any[] }>(`${this.apiUrl}/events/${id}`)
      .pipe(
        map((res) => {
          const mapped = {
            ...res.event,
            id: res.event._id,
            title: res.event.event_name,
            seats: res.seats || res.event.seats, // Returning seats with event
          };
          return mapped;
        })
      );
  }

  /**
   * Create Event
   * POST /api/events
   */
  addEvent(eventData: any): Observable<any> {
    // Map Frontend model to Backend schema
    const payload = {
      event_name: eventData.title,
      date: eventData.date,
      time: eventData.time,
      description: eventData.description,
      location: eventData.location,
      image: eventData.image,
      price_lower_foyer: eventData.price_lower_foyer,
      price_balcony: eventData.price_balcony,
      categories: eventData.categories, // Pass categories
      discounts: eventData.discounts, // Pass discounts
      organizer_id: this.getLoggedUser().id,
    };

    return this.http.post(`${this.apiUrl}/events`, payload);
  }

  /**
   * Delete Event
   * DELETE /api/events/:id
   */
  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/events/${id}`);
  }

  /**
   * Update Event
   * PUT /api/events/:id
   */
  updateEvent(id: string, eventData: any): Observable<any> {
    const payload = {
      event_name: eventData.title,
      description: eventData.description,
      date: eventData.date,
      time: eventData.time,
      location: eventData.location,
      image: eventData.image,
      price_lower_foyer: eventData.price_lower_foyer,
      price_balcony: eventData.price_balcony,
      categories: eventData.categories,
      discounts: eventData.discounts,
    };
    return this.http.put(`${this.apiUrl}/events/${id}`, payload);
  }

  /**
   * Get Organizer's Events
   * GET /api/events/organizer/:id
   */
  getOrganizerEvents(): Observable<any[]> {
    const user = this.getLoggedUser();

    if (!user || user.role !== 'organizer') {
      console.warn('⚠️ getOrganizerEvents - User not valid organizer:', {
        user,
        hasUser: !!user,
        role: user?.role,
      });
      return of([]);
    }

    const organizerId = user._id || user.id;

    return this.http
      .get<{ success: boolean; events: any[] }>(`${this.apiUrl}/events/organizer/${organizerId}`)
      .pipe(
        map((res) => {
          return res.events.map((e) => ({
            ...e,
            id: e._id,
            title: e.event_name,
          }));
        }),
        catchError((error) => {
          console.error('❌ getOrganizerEvents - Error:', error);
          return of([]);
        })
      );
  }

  /**
   * Get Organizer Statistics
   * GET /api/events/organizer/:organizerId/stats
   */
  getOrganizerStats(): Observable<any> {
    const user = this.getLoggedUser();
    if (!user || user.role !== 'organizer') {
      return of(null);
    }

    const organizerId = user._id || user.id;
    return this.http
      .get<{ success: boolean; stats: any }>(`${this.apiUrl}/events/organizer/${organizerId}/stats`)
      .pipe(
        map((res) => res.stats),
        catchError((error) => {
          console.error('Failed to fetch organizer stats:', error);
          return of(null);
        })
      );
  }

  // ==================== TICKETS & PAYMENT ====================

  /**
   * Create Payment (Midtrans)
   * POST /api/payment/create
   */
  createPayment(paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/create`, paymentData);
  }

  /**
   * Check Transaction Status (Manual Logic for Localhost)
   * POST /api/payment/check-status
   */
  checkTransactionStatus(orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/check-status`, { order_id: orderId });
  }

  getTransactionDetails(transactionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/payment/status/${transactionId}`);
  }

  /**
   * Get My Tickets
   * GET /api/payment/my-tickets/:userId
   */
  getMyTickets(): Observable<any[]> {
    const user = this.getLoggedUser();
    if (!user) {
      return of([]);
    }

    const userId = user._id || user.id;
    return this.http
      .get<{ success: boolean; tickets: any[] }>(`${this.apiUrl}/payment/my-tickets/${userId}`)
      .pipe(
        map((res) => res.tickets),
        catchError((error) => {
          console.error('Failed to fetch tickets:', error);
          return of([]);
        })
      );
  }

  // ==================== PENDING PURCHASE (Local Storage) ====================
  private readonly PENDING_PURCHASE_KEY = 'pending_purchase';

  savePendingPurchase(data: any): boolean {
    try {
      localStorage.setItem(this.PENDING_PURCHASE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  getPendingPurchase(): any | null {
    try {
      const data = localStorage.getItem(this.PENDING_PURCHASE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  clearPendingPurchase(): void {
    localStorage.removeItem(this.PENDING_PURCHASE_KEY);
  }
  /**
   * Join Waitlist
   * POST /api/waitlist/join
   */
  joinWaitlist(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/waitlist/join`, data);
  }

  /**
   * Get My Waitlist
   * GET /api/waitlist/user/:userId
   */
  getMyWaitlist(): Observable<any[]> {
    const user = this.getLoggedUser();
    if (!user) {
      return of([]);
    }
    const userId = user._id || user.id;
    return this.http
      .get<{ success: boolean; waitlist: any[] }>(`${this.apiUrl}/waitlist/user/${userId}`)
      .pipe(map((res) => res.waitlist));
  }
}
