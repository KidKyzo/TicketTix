# Models Directory

This directory contains TypeScript interfaces and types for type-safe data handling throughout the application.

## 📦 Available Models

### 1. **user.model.ts**

- `User` - Base user interface (Attendee or Admin)
- `Attendee` - Attendee-specific interface
- `Admin` - Admin-specific interface

### 2. **organizer.model.ts**

- `Organizer` - Event organizer interface

### 3. **event.model.ts**

- `Event` - Event data interface
- `EventDiscount` - Discount code interface
- `CreateEventDto` - Data transfer object for creating events
- `UpdateEventDto` - Data transfer object for updating events

### 4. **seat.model.ts**

- `Seat` - Seat data interface
- `SeatSelection` - Selected seat for cart/checkout

### 5. **transaction.model.ts**

- `Transaction` - Transaction/order data
- `PaymentRequest` - Payment request payload
- `PaymentResponse` - Payment response data

### 6. **api-response.model.ts**

- `ApiResponse<T>` - Generic API response wrapper
- `AuthResponse` - Authentication response
- `EventsResponse` - Events list response
- `EventDetailsResponse` - Single event with seats response
- `AdminStatsResponse` - Admin dashboard stats response

## 🚀 Usage

### Import individual models:

```typescript
import { Event } from '../../models/event.model';
import { User } from '../../models/user.model';
```

### Import multiple models from barrel export:

```typescript
import { Event, User, Seat } from '../../models';
```

### Using in components:

```typescript
export class BrowseEventPage {
  events: Event[] = [];

  constructor(private eventService: EventService) {}

  loadEvents() {
    this.eventService.getEvents().subscribe({
      next: (events: Event[]) => {
        this.events = events;
      },
    });
  }
}
```

### Using with services:

```typescript
@Injectable({
  providedIn: 'root',
})
export class EventService {
  getEvents(): Observable<Event[]> {
    return this.http.get<EventsResponse>(`${this.apiUrl}/events`).pipe(map((res) => res.events));
  }

  getEventById(id: string): Observable<Event> {
    return this.http
      .get<EventDetailsResponse>(`${this.apiUrl}/events/${id}`)
      .pipe(map((res) => res.event));
  }
}
```

## ✅ Benefits

- **Type Safety**: Catch errors at compile time
- **IntelliSense**: Get autocomplete suggestions in your IDE
- **Documentation**: Interfaces serve as self-documentation
- **Refactoring**: TypeScript catches breaking changes
- **Validation**: Know exactly what data structure to expect

## 📝 Notes

- Fields with `?` are optional
- `_id` is the MongoDB ObjectId (from backend)
- `id` is often used as a frontend alias for `_id`
- Some models have both backend field names (e.g., `event_name`) and frontend aliases (e.g., `title`)
