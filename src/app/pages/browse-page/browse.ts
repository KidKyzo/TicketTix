import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../services/storage.service';
import { Event } from '../../models/event.model';

@Component({
  selector: 'app-browse-events',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './browse.html',
  styleUrls: ['./browse.css'],
})
export class BrowseEventPage {
  events: Event[] = [];

  constructor(private storage: StorageService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    console.log('⏳ Loading events...');
    this.storage.getEvents().subscribe({
      next: (events) => {
        console.log('✅ Events loaded:', events);
        this.events = events;
        console.log('📊 Total events:', this.events.length);
        // Manually trigger change detection
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Failed to load events:', err);
        this.cdr.detectChanges();
      },
    });
  }

  getMinPrice(event: any): number {
    const prices = [];
    if (event.price_lower_foyer) prices.push(event.price_lower_foyer);
    if (event.price_balcony) prices.push(event.price_balcony);
    if (event.categories && event.categories.length > 0) {
      prices.push(...event.categories.map((c: any) => c.price));
    }
    return prices.length > 0 ? Math.min(...prices) : 0;
  }
}
