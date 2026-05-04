import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { Event } from '../../models/event.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home {
  data: Event[] = [];

  constructor(private storage: StorageService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.storage.getEvents().subscribe({
      next: (events) => {
        // Show only first 6 events on home page
        this.data = events.slice(0, 6);
        console.log('📌 Home page loaded events:', this.data.length);
        // Manually trigger change detection
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Failed to load events on home page:', err);
        this.data = [];
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
