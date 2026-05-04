import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
  routerSubscription: Subscription | null = null;

  // Dashboard Stats
  totalEvents = 0;
  totalTicketsSold = 0;
  totalRevenue = 0;
  overallOccupancy = 0;

  selectedEventId: number | null = null;
  searchTitle: string = '';

  // Active tab
  activeTab: 'events' | 'applications' = 'events';

  constructor(
    private router: Router,
    private dp: DatePipe,
    private storage: StorageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadData();
    document.body.classList.add('hide-layout');

    // Subscribe to router events to reload data on navigation
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadData();
      });
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-layout');
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadData() {
    // 1. Get Pending Applications
    this.storage.getPendingApplications().subscribe({
      next: (apps) => {
        this.pendingApplications = [...apps];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load applications', err),
    });

    // 2. Get Events (Admin View with Stats)
    this.storage.getAdminEvents().subscribe({
      next: (events) => {
        this.organizerEvents = [...events];
        this.cdr.detectChanges();
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

  // Helper methods using stats from backend
  eventTicketsSold(event: any) {
    return event.stats?.sold || 0;
  }
  
  eventRevenue(event: any) {
    return event.stats?.revenue || 0;
  }
  
  eventOccupancyPercent(event: any) {
    return event.stats?.occupancyPercent || 0;
  }
  
  eventTotalSeats(event: any) {
    return 300; // Fixed capacity
  }
  
  getEventSoldSeats(event: any): { balcony: number; lower: number } {
    return { 
      balcony: event.stats?.balconySold || 0, 
      lower: event.stats?.lowerSold || 0 
    };
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
    return new Date(dateString).toLocaleDateString('en-US', {
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
