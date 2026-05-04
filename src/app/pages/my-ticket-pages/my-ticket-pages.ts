import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-ticket-pages.html',
  styleUrls: ['./my-ticket-pages.css'],
})
export class MyTicketPages implements OnInit {
  tickets: any[] = [];
  isLoading = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private storage: StorageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.checkTransactionStatus();
  }

  checkTransactionStatus() {
    // Check if redirected from Midtrans (contains order_id)
    this.route.queryParams.subscribe(params => {
      const orderId = params['order_id'];

      if (orderId) {
        console.log('🔄 Checking transaction status for:', orderId);
        this.isLoading = true;

        this.storage.checkTransactionStatus(orderId).subscribe({
          next: (res) => {
            console.log('✅ Transaction status checked:', res);
            // Clear query params to prevent re-checking on reload
            this.router.navigate([], {
              queryParams: {
                order_id: null,
                status_code: null,
                transaction_status: null
              },
              queryParamsHandling: 'merge',
              replaceUrl: true
            });

            // Allow DB update time before loading tickets
            setTimeout(() => this.loadTickets(), 1000);
          },
          error: (err) => {
            console.error('❌ Status check failed:', err);
            this.loadTickets();
          }
        });
      } else {
        this.loadTickets();
      }
    });
  }

  loadTickets() {
    const logged = this.storage.getLoggedUser();

    if (!logged || logged.role !== 'attendee') {
      alert('Please login as Attendee to view your tickets.');
      this.router.navigate(['/login']);
      return;
    }

    // Fetch tickets from backend
    this.storage.getMyTickets().subscribe({
      next: (tickets) => {
        console.log('✅ Loaded tickets:', tickets);
        this.tickets = tickets;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Failed to load tickets:', err);
        this.tickets = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  formatNumber(v: number) {
    return new Intl.NumberFormat('id-ID').format(v);
  }

  formatDate(dateString: string | Date) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  generateQR(transactionId: string): string {
    const url = `http://localhost:4200/ticket-pdf/${transactionId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      url
    )}`;
  }

  pdfTicket: any = null; // Data for hidden template

  downloadPdf(ticket: any) {
    this.pdfTicket = ticket;
    this.cdr.detectChanges(); // Render the template

    const data = document.getElementById('hidden-pdf-template');
    if (!data) return;

    // Wait for images to load if necessary, but usually brief timeout is enough or onload checking
    setTimeout(() => {
      html2canvas(data, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      }).then(canvas => {
        const imgWidth = 208;
        const pageHeight = 295;
        const imgHeight = canvas.height * imgWidth / canvas.width;

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');

        pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);
        pdf.save(`Ticket-${ticket.transaction_id}.pdf`);

        this.pdfTicket = null; // Cleanup
        this.cdr.detectChanges();
      });
    }, 500); // 500ms delay to ensure QR render
  }

  getSeatNumbers(ticket: any): string {
    if (!ticket.seats || ticket.seats.length === 0) {
      return 'N/A';
    }
    return ticket.seats.map((s: any) => s.seat_number).join(', ');
  }

  getEventName(ticket: any): string {
    if (ticket.event && ticket.event.event_name) {
      return ticket.event.event_name;
    }
    return 'Event Details Unavailable';
  }

  getEventImage(ticket: any): string {
    if (ticket.event && ticket.event.image) {
      return ticket.event.image;
    }
    return 'https://via.placeholder.com/400x200?text=No+Image';
  }

  getAreaIcon(category: string): string {
    if (category?.toLowerCase().includes('balcony')) return 'B';
    return 'L';
  }
}
