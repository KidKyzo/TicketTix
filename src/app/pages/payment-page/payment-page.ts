import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-page.html',
  styleUrls: ['./payment-page.css'],
})
export class PaymentPage implements OnInit {
  purchaseData: any = null;
  isProcessing: boolean = false;

  constructor(private router: Router, private storage: StorageService) {}

  ngOnInit() {
    this.purchaseData = this.storage.getPendingPurchase();

    if (!this.purchaseData) {
      alert('No pending purchase found. Please select tickets first.');
      this.router.navigate(['/browse-events']);
      return;
    }
  }

  formatNumber(v: number): string {
    return new Intl.NumberFormat('id-ID').format(v);
  }

  processPayment() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    const logged = this.storage.getLoggedUser();
    const data = this.purchaseData;

    // Backend expects: event_id, seats, amount
    const seatsPayload =
      data.selectedSeats?.map((s: any) => ({
        seat_number: s.id,
        category: s.area === 'balcony' ? 'Balcony' : 'Lower Foyer',
        price: s.price,
      })) || [];

    const paymentData = {
      user_id: logged?.id,
      email: logged?.email,
      event_id: data.eventId,
      seats: seatsPayload,
      amount: data.total,
    };

    this.storage.createPayment(paymentData).subscribe({
      next: (res) => {
        this.isProcessing = false;
        if (res.success && res.redirect_url) {
          this.storage.clearPendingPurchase();
          window.location.href = res.redirect_url;
        } else {
          alert('Failed to initiate payment.');
        }
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Payment error', err);
        alert(err.error?.message || 'Payment failed.');
      },
    });
  }

  cancelPayment() {
    if (confirm('Cancel this payment?')) {
      this.storage.clearPendingPurchase();
      this.router.navigate(['/browse-events']);
    }
  }
}
