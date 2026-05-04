import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-waitlist-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waitlist-page.html',
  styleUrls: ['./waitlist-page.css'],
})
export class WaitlistPage implements OnInit {
  [x: string]: any;
  eventId: any = null;
  event: any = null;
  entries: any[] = [];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const logged = JSON.parse(localStorage.getItem('loggedUser') || 'null');
    if (!logged || (logged.role !== 'organizer' && logged.role !== 'admin')) {
      alert('Only organizer or admin can view waitlist.');
      this.router.navigate(['/login']);
      return;
    }

    this.eventId = this.route.snapshot.paramMap.get('id');
    this.loadData();
  }

  loadData() {
    const events = JSON.parse(localStorage.getItem('organizer_events') || '[]');
    this.event = events.find((e: any) => String(e.id) === String(this.eventId));

    const storedWait = JSON.parse(localStorage.getItem('waitlist') || '[]');
    this.entries = storedWait.filter((w: any) => String(w.eventId) === String(this.eventId));
  }

  removeEntry(id: string) {
    const storedWait = JSON.parse(localStorage.getItem('waitlist') || '[]');
    const filtered = storedWait.filter((w: any) => w.id !== id);
    localStorage.setItem('waitlist', JSON.stringify(filtered));
    this.loadData();
  }

  notifyEntry(entry: any) {
    if (!confirm(`Notify ${entry.email}? (simulation)`)) return;

    this.removeEntry(entry.id);

    alert(`Simulated notify to ${entry.email}. They should check their email.`);
  }

  clearAll() {
    if (!confirm('Clear all waitlist entries for this event?')) return;
    const storedWait = JSON.parse(localStorage.getItem('waitlist') || '[]');
    const filtered = storedWait.filter((w: any) => String(w.eventId) !== String(this.eventId));
    localStorage.setItem('waitlist', JSON.stringify(filtered));
    this.loadData();
  }

  goBack() {
    this.router.navigate(['/organizer-dashboard']);
  }
}
