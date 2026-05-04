import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
    selector: 'app-ticket-pdf',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ticket-pdf.html',
    styleUrls: ['./ticket-pdf.css']
})
export class TicketPdfPage implements OnInit {
    isLoading = true;
    errorMessage = '';
    ticket: any = null;
    qrUrl = '';
    pdfUrl: SafeResourceUrl | null = null;

    constructor(
        private route: ActivatedRoute,
        private storage: StorageService,
        private sanitizer: DomSanitizer
    ) { }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.errorMessage = 'Invalid Ticket ID';
            this.isLoading = false;
            return;
        }
        this.loadTicket(id);
    }

    loadTicket(id: string) {
        this.storage.getTransactionDetails(id).subscribe({
            next: (res) => {
                if (res.success && res.transaction) {
                    this.ticket = res.transaction;
                    this.qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        window.location.href
                    )}`;

                    // Wait for view to render template then generate PDF
                    setTimeout(() => this.generatePdf(), 1000);
                } else {
                    this.errorMessage = 'Ticket not found';
                    this.isLoading = false;
                }
            },
            error: (err) => {
                console.error(err);
                this.errorMessage = 'Failed to load ticket';
                this.isLoading = false;
            }
        });
    }

    generatePdf() {
        const data = document.getElementById('ticket-template');
        if (!data) {
            console.error('Template not found');
            return;
        }

        html2canvas(data, { scale: 2 }).then(canvas => {
            const imgWidth = 208; // A4 width mm
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');

            pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);

            const download = this.route.snapshot.queryParamMap.get('download') === 'true';

            if (download) {
                pdf.save(`Ticket-${this.ticket.transaction_id}.pdf`);
                this.isLoading = false;
                // Optional: Close window or show message
                this.errorMessage = 'Download started. You can close this tab.';
            } else {
                const blob = pdf.output('blob');
                const url = URL.createObjectURL(blob);
                this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
                this.isLoading = false;
            }
        }).catch(err => {
            console.error('PDF Generation failed', err);
            this.errorMessage = 'Failed to generate PDF';
            this.isLoading = false;
        });
    }
}
