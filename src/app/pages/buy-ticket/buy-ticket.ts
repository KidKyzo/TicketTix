import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { SeatMapComponent, Seat, AreaConfig } from '../../shared/seat-map/seat-map';

@Component({
  selector: 'app-buy-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule, SeatMapComponent],
  templateUrl: './buy-ticket.html',
  styleUrls: ['./buy-ticket.css'],
})
export class TicketPage implements OnInit {
  event: any = null;
  eventIdParam: string = '';

  // Seat map configurations
  balconyConfig: AreaConfig = { name: 'Balcony', rows: 10, cols: 10, price: 0, soldSeats: [] };
  lowerConfig: AreaConfig = { name: 'Lower Foyer', rows: 20, cols: 10, price: 0, soldSeats: [] };

  // Selected seats from seat map
  selectedSeats: Seat[] = [];

  enteredDiscount = '';
  appliedDiscountCode = '';
  discountPercent = 0;
  discountValid = false;
  discountInvalid = false;

  subtotal = 0;
  discountAmount = 0;
  total = 0;
  totalTickets = 0;

  isSoldOut: boolean = false;
  isLoading: boolean = true;
  isProcessing: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storage: StorageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.eventIdParam = this.route.snapshot.paramMap.get('id') || '';

    const logged = this.storage.getLoggedUser();

    if (!logged || logged.role !== 'attendee') {
      alert('You must be logged in as Attendee to buy tickets.');
      this.router.navigate(['/login']);
      return;
    }

    if (this.eventIdParam) {
      this.loadEvent();
    } else {
      alert('Invalid Event ID');
      this.router.navigate(['/']);
    }
  }

  loadEvent() {
    this.isLoading = true;
    this.storage.getEventById(this.eventIdParam).subscribe({
      next: (data) => {
        this.event = data;

        // Data contains 'seats' array from backend (all seats for this event)
        const allSeats = data.seats || [];

        // Determine category names and prices
        let balconyName = 'Balcony';
        let lowerName = 'Lower Foyer';
        let balconyPrice = data.price_balcony || 0;
        let lowerPrice = data.price_lower_foyer || 0;

        if (data.categories && data.categories.length > 0) {
          const bCat = data.categories.find((c: any) => c.section === 'balcony');
          if (bCat) {
            balconyName = bCat.name;
            balconyPrice = bCat.price;
          }
          const lCat = data.categories.find((c: any) => c.section === 'lower');
          if (lCat) {
            lowerName = lCat.name;
            lowerPrice = lCat.price;
          }
        }

        const soldBalcony = allSeats
          .filter((s: any) => s.category === balconyName && s.status === 'sold')
          .map((s: any) => s.seat_number);

        const soldLower = allSeats
          .filter((s: any) => s.category === lowerName && s.status === 'sold')
          .map((s: any) => s.seat_number);

        this.balconyConfig = {
          name: balconyName,
          rows: 10,
          cols: 10,
          price: balconyPrice,
          soldSeats: soldBalcony,
          startIndex: 201,
        };

        this.lowerConfig = {
          name: lowerName,
          rows: 20,
          cols: 10,
          price: lowerPrice,
          soldSeats: soldLower,
          startIndex: 1,
        };

        this.checkSoldOut(soldBalcony.length + soldLower.length);
        this.isLoading = false;
        // Manually trigger change detection
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load event', err);
        this.isLoading = false;
        alert('Event not found.');
        this.router.navigate(['/']);
        this.cdr.detectChanges();
      },
    });
  }

  formatNumber(v: any) {
    if (v === null || v === undefined) return '0';
    return new Intl.NumberFormat('id-ID').format(Number(v));
  }

  onSeatSelectionChange(seats: Seat[]) {
    this.selectedSeats = seats;
    this.totalTickets = seats.length;
    this.recalculate();
  }

  onTotalChange(total: number) {
    this.subtotal = total;
    this.recalculate();
  }

  useDiscount() {
    if (!this.enteredDiscount || this.enteredDiscount.trim() === '') {
      alert('Please enter a discount code.');
      return;
    }

    const code = this.enteredDiscount.trim().toUpperCase();

    // Check if event has discounts
    if (!this.event.discounts || this.event.discounts.length === 0) {
      this.discountInvalid = true;
      this.discountValid = false;
      alert('Invalid or expired discount code.');
      return;
    }

    // Find discount
    const discount = this.event.discounts.find((d: any) => d.code === code);

    if (discount) {
      this.appliedDiscountCode = discount.code;
      this.discountPercent = discount.discount;
      this.discountValid = true;
      this.discountInvalid = false;
      this.recalculate();
      alert(`Discount Applied: ${discount.discount}% OFF`);
    } else {
      this.discountInvalid = true;
      this.discountValid = false;
      this.recalculate(); // Reset likely not needed but safe
      alert('Invalid discount code.');
    }
  }

  clearDiscount() {
    this.enteredDiscount = '';
    this.appliedDiscountCode = '';
    this.discountPercent = 0;
    this.discountValid = false;
    this.discountInvalid = false;
    this.recalculate();
  }

  recalculate() {
    this.subtotal = this.selectedSeats.reduce((sum, s) => sum + s.price, 0);
    this.discountAmount = Math.round((this.subtotal * (this.discountPercent || 0)) / 100);
    this.total = this.subtotal - this.discountAmount;
  }

  checkSoldOut(totalSold: number) {
    const totalCapacity = 300;
    this.isSoldOut = totalSold >= totalCapacity;
  }

  proceedToPayment() {
    if (this.selectedSeats.length <= 0) {
      alert('Please select at least one seat.');
      return;
    }

    const logged = this.storage.getLoggedUser();
    if (!logged || logged.role !== 'attendee') {
      alert('Session expired. Please login again.');
      this.router.navigate(['/login']);
      return;
    }

    // Build payload for payment
    const seatsPayload = this.selectedSeats.map((s) => ({
      seat_number: s.id,
      category: s.area === 'balcony' ? this.balconyConfig.name : this.lowerConfig.name,
      price: s.price,
    }));

    const paymentData = {
      user_id: logged._id || logged.id, // Use _id from backend
      email: logged.email,
      full_name: logged.full_name,
      event_id: this.event._id || this.event.id, // Use _id from backend
      event_name: this.event.event_name || this.event.title,
      seats: seatsPayload,
      subtotal: this.subtotal,
      discount_code: this.appliedDiscountCode,
      discount_amount: this.discountAmount,
      total: this.total,
    };

    console.log('Navigating to payment page with:', paymentData);

    // Save to storage for payment page
    this.storage.savePendingPurchase(paymentData);

    // Navigate to mock payment page
    this.router.navigate(['/payment']);
  }

  // Waitlist Form State
  showWaitlistForm : boolean = false;
  waitlistEmail : string = '';

  toggleWaitlistForm() {
    this.showWaitlistForm = !this.showWaitlistForm;
    if (this.showWaitlistForm) {
      const logged = this.storage.getLoggedUser();
      this.waitlistEmail = logged ? logged.email : '';
    }
  }

  confirmJoinWaitlist() {
    const logged = this.storage.getLoggedUser();
    if (!logged) {
      alert('You must be logged in to join the waitlist.');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.waitlistEmail || !this.waitlistEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    const payload = {
      user_id: logged._id || logged.id,
      event_id: this.event._id || this.event.id,
      email: this.waitlistEmail
    };

    this.isProcessing = true;
    this.storage.joinWaitlist(payload).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.showWaitlistForm = false;
        alert(res.message);
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Waitlist error:', err);
        alert(err.error?.message || 'Failed to join waitlist');
      }
    });
  }

  goBack() {
    window.history.back();
  }
}
