import { Component, ChangeDetectorRef } from '@angular/core';
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
  statsData: any = null;

  // Stats
  totalEvents = 0;
  totalTicketsSold = 0;
  totalRevenue = 0;
  overallOccupancy = 0;

  constructor(
    private storage: StorageService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Check if organizer has access
    const logged = this.storage.getLoggedUser();

    if (!logged || logged.role !== 'organizer') {
      alert('Access denied. Organizer login required.');
      this.router.navigate(['/login']);
      return;
    }

    // Check if approved organizer needs password change
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
    console.log('🔄 Dashboard loadData() called');
    // Load events
    this.storage.getOrganizerEvents().subscribe({
      next: (events) => {
        console.log('📥 Dashboard received events:', events);
        // Force new array reference to trigger change detection
        this.events = [...events];
        console.log('✍️ Dashboard this.events assigned:', this.events);
        this.cdr.detectChanges();
        // Force another check after a tick
        setTimeout(() => {
          console.log('🔁 Delayed check - events still:', this.events);
          this.cdr.markForCheck();
        }, 0);
      },
      error: (err) => console.error('Failed to load events', err),
    });

    // Load statistics
    this.storage.getOrganizerStats().subscribe({
      next: (stats) => {
        if (stats) {
          this.statsData = stats;
          this.totalEvents = stats.overall.totalEvents;
          this.totalTicketsSold = stats.overall.totalTicketsSold;
          this.totalRevenue = stats.overall.totalRevenue;
          this.overallOccupancy = stats.overall.averageOccupancy;
          console.log('✅ Organizer stats loaded:', stats);
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load stats', err),
    });
  }

  // Helper methods for stats
  eventTicketsSold(eventId: string): number {
    if (!this.statsData || !this.statsData.events) return 0;
    const eventStat = this.statsData.events.find((e: any) => e.event_id == eventId);
    return eventStat ? eventStat.ticketsSold : 0;
  }

  eventRevenue(eventId: string): number {
    if (!this.statsData || !this.statsData.events) return 0;
    const eventStat = this.statsData.events.find((e: any) => e.event_id == eventId);
    return eventStat ? eventStat.revenue : 0;
  }

  eventOccupancyPercent(event: any): number {
    if (!this.statsData || !this.statsData.events) return 0;
    const eventStat = this.statsData.events.find((e: any) => e.event_id == event._id);
    return eventStat ? eventStat.occupancyPercent : 0;
  }

  getEventSoldSeats(event: any): { balcony: number; lower: number } {
    if (!this.statsData || !this.statsData.events) {
      return { balcony: 0, lower: 0 };
    }
    const eventStat = this.statsData.events.find((e: any) => e.event_id == event._id);
    if (!eventStat || !eventStat.breakdown) {
      return { balcony: 0, lower: 0 };
    }
    return {
      balcony: eventStat.breakdown.balcony.sold,
      lower: eventStat.breakdown.lowerFoyer.sold,
    };
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
