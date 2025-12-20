import { Component } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DecimalPipe, DatePipe],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
})
export class AdminDashboardPage {
  organizerEvents: any[] = [];
  pendingApplications: any[] = [];

  // Dashboard Stats
  totalEvents = 0;
  totalTicketsSold = 0;
  totalRevenue = 0;
  overallOccupancy = 0;

  selectedEventId: number | null = null;
  searchTitle: string = '';

  // Active tab
  activeTab: 'events' | 'applications' = 'events';

  constructor(private router: Router, private dp: DatePipe, private storage: StorageService) {}

  ngOnInit() {
    this.loadData();
    document.body.classList.add('hide-layout');
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-layout');
  }

  loadData() {
    // 1. Get Pending Applications
    this.storage.getPendingApplications().subscribe({
      next: (apps) => {
        this.pendingApplications = apps;
      },
      error: (err) => console.error('Failed to load applications', err),
    });

    // 2. Get Events (Admin View - assuming getEvents returns all public events)
    // Note: Admin might need a specific 'getAllEvents' including drafts if implemented
    this.storage.getEvents().subscribe({
      next: (events) => {
        this.organizerEvents = events;
      },
      error: (err) => console.error('Failed to load events', err),
    });

    // 3. Get Stats via API
    this.storage.getAdminStats().subscribe({
      next: (stats) => {
        if (stats) {
          this.totalEvents = stats.totalEvents || 0;
          this.totalTicketsSold = stats.totalTickets || 0;
          this.totalRevenue = stats.totalRevenue || 0;
          // Occupancy calc might need total capacity logic if backend doesn't provide it
          // For now, setting 0 or mock
          this.overallOccupancy = 0;
        }
      },
      error: (err) => console.error('Failed to load stats', err),
    });
  }

  filteredEvents() {
    const q = this.searchTitle.trim().toLowerCase();
    if (!q) return this.organizerEvents;
    return this.organizerEvents.filter((e) => (e.title || '').toLowerCase().includes(q));
  }

  // NOTE: These helper methods for event-specific stats rely on frontend data
  // Since we don't have full ticket data on frontend, we might show N/A or simplified view
  // For this refactor, we remove complex client-side calc
  eventTicketsSold(eventId: number) {
    return 0;
  }
  eventRevenue(eventId: number) {
    return 0;
  }
  eventOccupancyPercent(event: any) {
    return 0;
  }
  eventTotalSeats(event: any) {
    return 300; // Fixed capacity as per backend
  }
  getEventSoldSeats(event: any): { balcony: number; lower: number } {
    return { balcony: 0, lower: 0 }; // Placeholder, backend stats needed
  }
  goToAnalyticsById(ev: any) {
    this.router.navigate(['/analytics', ev.id]);
  }

  deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return;

    this.storage.deleteEvent(id).subscribe({
      next: () => {
        alert('Event deleted.');
        this.loadData();
      },
      error: () => alert('Failed to delete event.'),
    });
  }

  // Organizer Approval Methods
  approveApplication(id: string) {
    if (!confirm('Approve this organizer application?')) return;

    this.storage.approveOrganizer(id).subscribe({
      next: (res) => {
        alert('Organizer approved successfully! Email sent.');
        this.loadData();
      },
      error: (err) => alert('Failed to approve application.'),
    });
  }

  rejectApplication(id: string) {
    if (!confirm('Reject this organizer application?')) return;

    this.storage.rejectOrganizer(id).subscribe({
      next: (res) => {
        alert('Application rejected.');
        this.loadData();
      },
      error: (err) => alert('Failed to reject application.'),
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  logout() {
    this.storage.logout();
    alert('Logged out');
    window.location.href = '/login';
  }
}
