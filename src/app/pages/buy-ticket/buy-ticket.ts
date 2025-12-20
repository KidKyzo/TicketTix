import { Component, OnInit } from '@angular/core';
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
    private storage: StorageService
  ) {}

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

        // Filter sold seats by category
        // Backend categories: 'Lower Foyer', 'Balcony'
        // SeatMap expects seatIDs (e.g. 'A1', 'B2') in soldSeats array
        const soldBalcony = allSeats
          .filter((s: any) => s.category === 'Balcony' && s.status === 'sold')
          .map((s: any) => s.seat_number);

        const soldLower = allSeats
          .filter((s: any) => s.category === 'Lower Foyer' && s.status === 'sold')
          .map((s: any) => s.seat_number);

        // Configure areas
        // Lower Foyer (200 seats): A1 - A200
        // Balcony (100 seats): A201 - A300
        this.balconyConfig = {
          name: 'Balcony',
          rows: 10,
          cols: 10,
          price: data.price_balcony || 0,
          soldSeats: soldBalcony,
          startIndex: 201, // Starts at A201
        };

        this.lowerConfig = {
          name: 'Lower Foyer',
          rows: 20,
          cols: 10,
          price: data.price_lower_foyer || 0,
          soldSeats: soldLower,
          startIndex: 1, // Starts at A1
        };

        this.checkSoldOut(soldBalcony.length + soldLower.length);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load event', err);
        this.isLoading = false;
        alert('Event not found.');
        this.router.navigate(['/']);
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
    // Basic local discount logic (mock for now or from event data if backend supported)
    // For now assuming backend doesn't return discounts array in this iteration
    alert('Discount feature not available server-side yet.');
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

    this.isProcessing = true;

    // Build payload for backend
    // Backend expects: event_id, seats (array of { seat_number, category, price }), amount
    const seatsPayload = this.selectedSeats.map((s) => ({
      seat_number: s.id,
      category: s.area === 'balcony' ? 'Balcony' : 'Lower Foyer',
      price: s.price,
    }));

    const paymentData = {
      user_id: logged.id, // Ensure user object has ID when saved
      email: logged.email, // Passing email explicitly if needed
      event_id: this.event.id,
      seats: seatsPayload,
      amount: this.total,
    };

    console.log('Processing payment...', paymentData);

    this.storage.createPayment(paymentData).subscribe({
      next: (res) => {
        this.isProcessing = false;
        if (res.success && res.redirect_url) {
          // Redirect to Midtrans
          console.log('Redirecting to:', res.redirect_url);
          window.location.href = res.redirect_url;
        } else {
          alert('Failed to initiate payment. No redirect URL returned.');
        }
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Payment error', err);
        const msg = err.error?.message || 'Payment initiation failed.';
        alert(msg);
      },
    });
  }

  joinWaitlist() {
    // Waitlist functionality is client-side only for now
    alert('Waitlist feature coming soon!');
  }

  goBack() {
    window.history.back();
  }
}
