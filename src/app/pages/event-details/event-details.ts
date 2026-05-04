import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-details.html',
  styleUrls: ['./event-details.css']
})
export class EventDetails {
  
  id: string | null = null;
  event: any = null;
  loading = true;
  error = '';
  
  // Ticket Selection
  selectedCategory: any = null;
  quantity: number = 1;
  
  // Discount
  discountCode: string = '';
  discountApplied = false;
  discountAmount = 0;
  
  // Computed
  finalPrice = 0;

  constructor(private route: ActivatedRoute, private storage: StorageService, private router: Router) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.loadEventData(this.id);
    } else {
      this.error = 'Invalid Event ID';
      this.loading = false;
    }
  }

  loadEventData(id: string) {
    this.storage.getEventById(id).subscribe({
      next: (data) => {
        this.event = data;
        this.loading = false;
        console.log('Event loaded:', this.event);
      },
      error: (err) => {
        console.error('Load event error:', err);
        this.error = 'Failed to load event details.';
        this.loading = false;
      }
    });
  }
  
  get lowerCategories() {
    return this.event?.categories?.filter((c: any) => c.section === 'lower') || [];
  }
  
  get balconyCategories() {
    return this.event?.categories?.filter((c: any) => c.section === 'balcony') || [];
  }
  
  selectCategory(category: any) {
    this.selectedCategory = category;
    this.discountApplied = false;
    this.discountAmount = 0; // Reset discount on category change
    this.calculateFinalPrice();
  }
  
  applyDiscount() {
    if (!this.discountCode.trim()) return;
    
    if (!this.event.discounts || this.event.discounts.length === 0) {
      alert('Invalid discount code');
      return;
    }
    
    const validDiscount = this.event.discounts.find((d: any) => d.code === this.discountCode.trim());
    
    if (validDiscount) {
      this.discountApplied = true;
      // Assume percentage for now based on user prompt "10%"
      // If backend stored 10, it's 10%.
      this.discountAmount = validDiscount.discount; 
      alert(`Discount applied! ${this.discountAmount}% off.`);
      this.calculateFinalPrice();
    } else {
      alert('Invalid discount code');
      this.discountApplied = false;
      this.discountAmount = 0;
      this.calculateFinalPrice();
    }
  }
  
  calculateFinalPrice() {
    if (!this.selectedCategory) {
      this.finalPrice = 0;
      return;
    }
    
    let price = this.selectedCategory.price;
    
    if (this.discountApplied) {
      price = price - (price * (this.discountAmount / 100));
    }
    
    this.finalPrice = price;
  }
  
  buyTicket() {
    if (!this.selectedCategory) {
      alert('Please select a ticket category');
      return;
    }
    
    // Save pending purchase
    const purchaseData = {
      eventId: this.event.id,
      eventTitle: this.event.title,
      categoryName: this.selectedCategory.name,
      originalPrice: this.selectedCategory.price,
      finalPrice: this.finalPrice,
      discountApplied: this.discountApplied,
      discountCode: this.discountApplied ? this.discountCode : null,
      seatSection: this.selectedCategory.section
    };
    
    if (this.storage.savePendingPurchase(purchaseData)) {
      // Navigate to payment page (assuming /payment or similar exists, otherwise mock success)
      // Since I haven't seen a payment page in the list, I'll alert success for now or check routes
      alert(`Proceeding to payment for ${this.selectedCategory.name}. Total: Rp ${this.finalPrice}`);
      // For now, reload or just stay
    } else {
      alert('Failed to process ticket selection');
    }
  }

}
