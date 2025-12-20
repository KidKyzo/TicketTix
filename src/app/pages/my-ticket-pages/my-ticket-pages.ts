import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

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

  constructor(private router: Router, private storage: StorageService) {}

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    const logged = this.storage.getLoggedUser();

    if (!logged || logged.role !== 'attendee') {
      alert('Please login as Attendee to view your tickets.');
      this.router.navigate(['/login']);
      return;
    }

    // Get all tickets returns sync empty for now (backend pending)
    const allTickets = this.storage.getMyTickets();
    this.tickets = allTickets.filter((t: any) => t.buyerEmail === logged.email);

    // Enrich with event info (if we had events)
    // Since getEvents is async, we skip enrichment for now or show without images
    this.isLoading = false;
  }

  formatNumber(v: number) {
    return new Intl.NumberFormat('id-ID').format(v);
  }

  formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('id-ID');
  }

  generateQR(text: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
      text
    )}`;
  }

  getSeatNumbers(ticket: any): string {
    if (ticket.seatNumbers) {
      return ticket.seatNumbers;
    }

    if (ticket.tickets && ticket.tickets.length > 0) {
      const seats = ticket.tickets.filter((t: any) => t.seatNumber).map((t: any) => t.seatNumber);

      if (seats.length > 0) {
        return seats.join(', ');
      }

      return ticket.tickets.map((t: any) => `${t.areaName || 'General'} x${t.qty}`).join(', ');
    }

    return 'N/A';
  }

  getAreaIcon(areaName: string): string {
    if (areaName?.toLowerCase().includes('balcony')) return 'B';
    return 'L';
  }
}
