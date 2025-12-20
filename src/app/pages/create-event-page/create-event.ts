import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-event-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.html', // Note: Check if filename is create-event.html or create-event-page.html. List dir said create-event.html
  styleUrls: ['./create-event.css'],
})
export class CreateEventPageComponent {
  // Simple model matching backend
  event = {
    title: '',
    description: '',
    date: '',
    time: '',
    location: 'Grand Event Hall - Jakarta',
    image: '',
    price_lower_foyer: 0,
    price_balcony: 0,
  };

  isSubmitting: boolean = false;

  constructor(private storage: StorageService, private router: Router) {}

  ngOnInit() {
    // Check organizer access
    const logged = this.storage.getLoggedUser();
    if (!logged || logged.role !== 'organizer') {
      alert('Access denied.');
      this.router.navigate(['/login']);
    }
  }

  validate(): boolean {
    if (!this.event.title.trim()) {
      alert('Event title is required.');
      return false;
    }
    if (!this.event.date) {
      alert('Date is required.');
      return false;
    }
    if (this.event.price_lower_foyer <= 0) {
      alert('Price for Lower Foyer must be > 0');
      return false;
    }
    if (this.event.price_balcony <= 0) {
      alert('Price for Balcony must be > 0');
      return false;
    }
    return true;
  }

  saveEvent() {
    if (this.isSubmitting) return;
    if (!this.validate()) return;

    this.isSubmitting = true;

    this.storage.addEvent(this.event).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Event created successfully! 300 seats generated.');
          this.router.navigate(['/organizer-dashboard']);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Create event error:', err);
        const msg = err.error?.message || 'Failed to create event.';
        alert(msg);
      },
    });
  }

  goBack() {
    window.history.back();
  }
}
