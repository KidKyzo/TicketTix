import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-event.html', // Check filename in directory if needed, assuming edit-event.html
  styleUrls: ['./edit-event.css'],
})
export class EditEventPage {
  eventId: string = '';
  event: any = {
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    image: '',
    price_lower_foyer: 0,
    price_balcony: 0,
  };

  isLoading: boolean = true;
  isSubmitting: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storage: StorageService
  ) {}

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.eventId) {
      alert('Invalid Event ID');
      this.goBack();
      return;
    }

    this.loadEvent();
  }

  loadEvent() {
    this.isLoading = true;
    this.storage.getEventById(this.eventId).subscribe({
      next: (data) => {
        this.isLoading = false;
        // Map backend data to simple model if needed, but getEventById in storage already does some mapping
        this.event = {
          title: data.title,
          description: data.description,
          date: data.date,
          time: data.time,
          location: data.location,
          image: data.image,
          price_lower_foyer: data.price_lower_foyer,
          price_balcony: data.price_balcony,
        };
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Load event error:', err);
        alert('Failed to load event.');
        this.goBack();
      },
    });
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

    this.storage.updateEvent(this.eventId, this.event).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Event updated successfully!');
          this.router.navigate(['/organizer-dashboard']);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Update event error:', err);
        alert('Failed to update event.');
      },
    });
  }

  goBack() {
    this.router.navigate(['/organizer-dashboard']);
  }
}
