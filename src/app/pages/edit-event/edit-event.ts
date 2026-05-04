import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-event.html',
  styleUrls: ['./edit-event.css'],
})
export class EditEventPage implements OnDestroy {
  eventId: string = '';
  event = {
    title: '',
    date: '',
    time: '',
    location: 'Ticketix Hall - Bali',
    description: '',
    image: '',
    price_lower_foyer: 0,
    price_balcony: 0,
  };

  // Categories (same as create-event)
  lowerCategories: any[] = [];
  balconyCategories: any[] = [];

  // Discount
  discountCode: string = '';

  imagePreview: string | null = null;
  selectedFile: File | null = null;
  isSubmitting = false;
  isLoading = true;

  constructor(
    private storage: StorageService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Hide navbar/layout
    document.body.classList.add('hide-layout');

    // Check organizer access
    const logged = this.storage.getLoggedUser();
    if (!logged || logged.role !== 'organizer') {
      alert('Access denied. Organizer login required.');
      this.router.navigate(['/login']);
      return;
    }

    // Get event ID from route
    this.route.params.subscribe((params) => {
      this.eventId = params['id'];
      this.loadEvent();
    });
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-layout');
  }

  loadEvent() {
    this.storage.getEventById(this.eventId).subscribe({
      next: (eventData) => {
        if (eventData) {
          this.event = {
            title: eventData.event_name || eventData.title,
            date: eventData.date,
            time: eventData.time,
            location: 'Ticketix Hall - Bali', // Always use fixed location
            description: eventData.description,
            image: eventData.image,
            price_lower_foyer: eventData.price_lower_foyer || 0,
            price_balcony: eventData.price_balcony || 0,
          };

          // Load categories
          if (eventData.categories && eventData.categories.length > 0) {
            this.lowerCategories = eventData.categories
              .filter((c: any) => c.section === 'lower')
              .map((c: any) => ({
                name: c.name,
                seats: c.totalCapacity || c.seats,
                price: c.price,
              }));
            this.balconyCategories = eventData.categories
              .filter((c: any) => c.section === 'balcony')
              .map((c: any) => ({
                name: c.name,
                seats: c.totalCapacity || c.seats,
                price: c.price,
              }));
          } else {
            // Legacy event without categories - create default ones
            this.lowerCategories = [
              { name: 'Lower Foyer', seats: 200, price: eventData.price_lower_foyer || 0 },
            ];
            this.balconyCategories = [
              { name: 'Balcony', seats: 100, price: eventData.price_balcony || 0 },
            ];
          }

          // Load discount code
          if (eventData.discounts && eventData.discounts.length > 0) {
            this.discountCode = eventData.discounts[0].code || '';
          }

          // Show existing image
          if (this.event.image) {
            this.imagePreview = this.event.image;
          }

          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Failed to load event:', err);
        alert('Failed to load event details');
        this.router.navigate(['/organizer-dashboard']);
      },
    });
  }

  addCategory(section: 'lower' | 'balcony') {
    // Limit to one category per section
    if (section === 'lower' && this.lowerCategories.length >= 1) {
      alert('Only one category is allowed for Lower Foyer section.');
      return;
    }
    if (section === 'balcony' && this.balconyCategories.length >= 1) {
      alert('Only one category is allowed for Balcony section.');
      return;
    }

    const newCat = { name: '', seats: 0, price: 0 };
    if (section === 'lower') {
      this.lowerCategories.push(newCat);
    } else {
      this.balconyCategories.push(newCat);
    }
  }

  removeCategory(section: 'lower' | 'balcony', index: number) {
    if (section === 'lower') {
      this.lowerCategories.splice(index, 1);
    } else {
      this.balconyCategories.splice(index, 1);
    }
  }

  get lowerSeatsCount(): number {
    return this.lowerCategories.reduce((sum, cat) => sum + (cat.seats || 0), 0);
  }

  get balconySeatsCount(): number {
    return this.balconyCategories.reduce((sum, cat) => sum + (cat.seats || 0), 0);
  }

  get totalSeats(): number {
    return this.lowerSeatsCount + this.balconySeatsCount;
  }

  onImageSelect(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, WEBP)');
      event.target.value = '';
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert('Image must be less than 2MB. Please choose a smaller file.');
      event.target.value = '';
      return;
    }

    this.selectedFile = file;

    // Convert to base64 for preview and storage
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
      this.event.image = e.target.result; // Store base64 string
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.imagePreview = null;
    this.selectedFile = null;
    this.event.image = '';
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  updateEvent() {
    // Validation
    if (!this.event.title.trim()) {
      alert('Please enter an event title');
      return;
    }

    if (!this.event.date) {
      alert('Please select a date');
      return;
    }

    if (!this.event.time) {
      alert('Please select a time');
      return;
    }

    if (!this.event.description.trim()) {
      alert('Please enter a description');
      return;
    }

    if (!this.event.image) {
      alert('Please upload an event image');
      return;
    }

    // Validate Seats
    if (this.totalSeats !== 300) {
      alert(`Total seats must be exactly 300. Current total: ${this.totalSeats}`);
      return;
    }

    if (this.lowerSeatsCount !== 200) {
      alert(`Lower Foyer must have exactly 200 seats. Current: ${this.lowerSeatsCount}`);
      return;
    }

    if (this.balconySeatsCount !== 100) {
      alert(`Balcony must have exactly 100 seats. Current: ${this.balconySeatsCount}`);
      return;
    }

    // Validate empty categories
    const allCats = [...this.lowerCategories, ...this.balconyCategories];
    for (const cat of allCats) {
      if (!cat.name || cat.seats <= 0 || cat.price < 0) {
        alert('Please fill in all category details correctly.');
        return;
      }
    }

    this.isSubmitting = true;

    // Prepare categories for backend
    const categories = [
      ...this.lowerCategories.map((c) => ({ ...c, section: 'lower' })),
      ...this.balconyCategories.map((c) => ({ ...c, section: 'balcony' })),
    ];

    // Prepare discounts
    const discounts = [];
    if (this.discountCode.trim()) {
      discounts.push({
        code: this.discountCode.trim(),
        discount: 10, // Fixed 10%
      });
    }

    const eventData = {
      title: this.event.title,
      date: this.event.date,
      time: this.event.time,
      location: this.event.location,
      description: this.event.description,
      image: this.event.image,
      categories: categories,
      discounts: discounts,
      price_lower_foyer: 0,
      price_balcony: 0,
    };

    this.storage.updateEvent(this.eventId, eventData).subscribe({
      next: (res) => {
        alert('Event updated successfully!');
        this.router.navigate(['/organizer-dashboard']);
      },
      error: (err) => {
        console.error('Update event error:', err);
        alert(err.error?.message || 'Failed to update event. Please try again.');
        this.isSubmitting = false;
      },
    });
  }

  goBack() {
    this.router.navigate(['/organizer-dashboard']);
  }
}
