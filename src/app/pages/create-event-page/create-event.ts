import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.html',
  styleUrls: ['./create-event.css'],
})
export class CreateEventPageComponent implements OnDestroy {
  event = {
    title: '',
    date: '',
    time: '',
    location: 'Ticketix Hall - Bali',
    description: '',
    image: '',
    // Deprecated flat prices
    price_lower_foyer: 0,
    price_balcony: 0,
  };

  // Categories
  lowerCategories: any[] = [];
  balconyCategories: any[] = [];

  // Discount
  discountCode: string = '';

  imagePreview: string | null = null;
  selectedFile: File | null = null;
  isSubmitting = false;

  constructor(private storage: StorageService, private router: Router) {}

  ngOnInit() {
    // Hide navbar/layout
    document.body.classList.add('hide-layout');

    const logged = this.storage.getLoggedUser();
    if (!logged || logged.role !== 'organizer') {
      alert('Access denied. Organizer login required.');
      this.router.navigate(['/login']);
    }

    // Initialize default categories to make it easier for user
    this.addCategory('lower');
    this.addCategory('balcony');
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-layout');
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

  saveEvent() {
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
      image: this.event.image, // Base64 string
      categories: categories,
      discounts: discounts,
      // Send 0 for old fields just in case
      price_lower_foyer: 0,
      price_balcony: 0,
    };

    this.storage.addEvent(eventData).subscribe({
      next: (res) => {
        alert('Event created successfully!');
        this.router.navigate(['/organizer-dashboard']);
      },
      error: (err) => {
        console.error('Create event error:', err);
        alert(err.error?.message || 'Failed to create event. Please try again.');
        this.isSubmitting = false;
      },
    });
  }

  goBack() {
    this.router.navigate(['/organizer-dashboard']);
  }
}
