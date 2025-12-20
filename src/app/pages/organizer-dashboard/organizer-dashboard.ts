import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './organizer-dashboard.html',
  styleUrls: ['./organizer-dashboard.css'],
})
export class OrganizerDashboardPage {
  events: any[] = [];
  tickets: any[] = []; // Will be empty until backend supports "My Tickets" or stats API

  // Stats
  totalEvents = 0;
  totalTicketsSold = 0;
  totalRevenue = 0;
  overallOccupancy = 0;

  constructor(private storage: StorageService, private router: Router) {}

  ngOnInit() {
    // Check if organizer has access
    const logged = this.storage.getLoggedUser();

    if (!logged || logged.role !== 'organizer') {
      alert('Access denied. Organizer login required.');
      this.router.navigate(['/login']);
      return;
    }

    // Check if approved organizer needs password change
    // Since we rely on backend response during login to redirect, we might not have isFirstLogin in storage
    // But we can check user object if it persisted
    if (logged.is_first_login) {
      alert('You must change your password before accessing the dashboard.');
      this.router.navigate(['/change-password']);
      return;
    }

    this.loadData();
    document.body.classList.add('hide-layout');
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-layout');
  }

  loadData() {
    this.storage.getOrganizerEvents().subscribe({
      next: (events) => {
        this.events = events;
        this.computeStats();
      },
      error: (err) => console.error('Failed to load events', err),
    });

    // Tickets data is currently mock/empty from backend, so stats will be 0
    this.tickets = [];
  }

  computeStats() {
    this.totalEvents = this.events.length;
    // Stats calculation currently disabled until backend provides aggregated stats for organizer
    this.totalTicketsSold = 0;
    this.totalRevenue = 0;
    this.overallOccupancy = 0;
  }

  // Helper methods for stats (returning 0 for now)
  eventTicketsSold(eventId: string): number {
    return 0;
  }
  eventRevenue(eventId: string): number {
    return 0;
  }
  eventOccupancyPercent(event: any): number {
    return 0;
  }

  getEventSoldSeats(event: any): { balcony: number; lower: number } {
    return { balcony: 0, lower: 0 };
  }

  formatNumber(v: number): string {
    return new Intl.NumberFormat('id-ID').format(v);
  }

  deleteEvent(id: string) {
    if (confirm('Are you sure you want to delete this event?')) {
      this.storage.deleteEvent(id).subscribe({
        next: () => {
          this.loadData();
        },
        error: (err) => alert('Failed to delete event.'),
      });
    }
  }

  logout() {
    this.storage.logout();
    alert('Logged out');
    window.location.href = '/login';
  }
}
