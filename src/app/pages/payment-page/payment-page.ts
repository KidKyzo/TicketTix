import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  constructor(
    private router: Router,
    private storage: StorageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Get pending purchase data
    this.purchaseData = this.storage.getPendingPurchase();

    if (!this.purchaseData) {
      alert('No pending purchase found. Please select seats first.');
      this.router.navigate(['/']);
      return;
    }

    console.log('Payment page loaded with:', this.purchaseData);
  }

  getTicketTypes(): string {
    if (!this.purchaseData?.seats || this.purchaseData.seats.length === 0) {
      return '-';
    }
    // Get unique categories
    const categories = [...new Set(this.purchaseData.seats.map((s: any) => s.category))];
    return categories.join(', ');
  }

  getAveragePrice(): number {
    if (!this.purchaseData?.subtotal || !this.purchaseData?.seats?.length) {
      return 0;
    }
    return Math.round(this.purchaseData.subtotal / this.purchaseData.seats.length);
  }

  confirmPayment() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    // Call create payment API
    this.storage
      .createPayment({
        ...this.purchaseData,
        amount: this.purchaseData.total, // Backend expects 'amount'
        email: this.storage.getLoggedUser()?.email, // Ensure email is passed
      })
      .subscribe({
        next: (response: any) => {
          // Type as any to access token
          console.log('✅ Payment token created:', response);

          if (response.token) {
            // @ts-ignore
            window.snap.pay(response.token, {
              onSuccess: (result: any) => {
                console.log('✅ Payment success:', result);
                this.handlePaymentResult('success', result);
              },
              onPending: (result: any) => {
                console.log('⏳ Payment pending:', result);
                this.handlePaymentResult('pending', result);
              },
              onError: (result: any) => {
                console.error('❌ Payment error:', result);
                this.handlePaymentResult('error', result);
              },
              onClose: () => {
                console.log('❌ Payment popup closed');
                this.isProcessing = false;
                alert('Payment cancelled');
              },
            });
          } else {
            this.isProcessing = false;
            alert('Failed to get payment token');
          }
        },
        error: (err) => {
          console.error('❌ Create payment failed:', err);
          this.isProcessing = false;
          alert(err.error?.message || 'Failed to initialize payment');
        },
      });
  }

  handlePaymentResult(status: string, result: any) {
    this.isProcessing = false;

    if (status === 'success') {
      this.storage.clearPendingPurchase();
      alert(`Payment Successful! Transaction ID: ${result.order_id}`);
      // Pass order_id so my-tickets page can verify status
      this.router.navigate(['/my-tickets'], { queryParams: { order_id: result.order_id } });
    } else if (status === 'pending') {
      this.storage.clearPendingPurchase();
      alert('Payment is pending. Please complete it.');
      this.router.navigate(['/my-tickets'], { queryParams: { order_id: result.order_id } });
    } else {
      alert('Payment failed or cancelled.');
    }
  }

  goBack() {
    window.history.back();
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }
}
