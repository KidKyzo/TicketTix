import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-page.html',
  styleUrls: ['./analytics-page.css'],
})
export class AnalyticsPage implements OnDestroy {
  event: any = null;
  allTickets: any[] = [];

  reportPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
  filterDate: string = '';
  filterWeekStart: string = '';
  filterMonth: string = '';

  totalTickets = 0;
  totalRevenue = 0;
  occupancyPercent = 0;

  ticketChart: any = null;
  revenueChart: any = null;
  occupancyChart: any = null;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const param = this.route.snapshot.paramMap.get('id') || '';
    const storedEvents = JSON.parse(localStorage.getItem('organizer_events') || '[]');

    let found = storedEvents.find((ev: any) => String(ev.id) === String(param));
    if (!found) {
      const idx = Number(param);
      if (!isNaN(idx) && storedEvents[idx]) {
        found = storedEvents[idx];
      }
    }
    if (!found && param) {
      found = storedEvents.find((ev: any) => String(ev.eventId || ev.id) === String(param));
    }

    if (!found) {
      alert('Event not found');
      this.router.navigate(['/']);
      return;
    }

    this.event = found;

    const storedTickets = JSON.parse(localStorage.getItem('my_tickets') || '[]');
    this.allTickets = storedTickets.filter((t: any) => String(t.eventId) === String(this.event.id));

    const today = new Date();
    this.filterDate = today.toISOString().slice(0, 10);
    this.filterMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    this.regenerate();
    document.body.classList.add('hide-layout');
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-layout');
    if (this.ticketChart) this.ticketChart.destroy();
    if (this.revenueChart) this.revenueChart.destroy();
    if (this.occupancyChart) this.occupancyChart.destroy();
  }

  onPeriodChange() {
    const today = new Date();
    if (this.reportPeriod === 'daily') {
      this.filterDate = today.toISOString().slice(0, 10);
    } else if (this.reportPeriod === 'weekly') {
      const d = new Date();
      const day = d.getDay();
      const monday = new Date(d);
      const diff = (day + 6) % 7;
      monday.setDate(d.getDate() - diff);
      this.filterWeekStart = monday.toISOString().slice(0, 10);
    } else {
      this.filterMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }
    this.regenerate();
  }

  regenerate() {
    const filtered = this.filterTicketsByPeriod();

    this.totalTickets = filtered.reduce(
      (acc: number, t: any) =>
        acc + (t.tickets || []).reduce((a: number, b: any) => a + Number(b.qty || 0), 0),
      0
    );

    this.totalRevenue = filtered.reduce((acc: number, t: any) => acc + Number(t.total || 0), 0);

    const currentRemaining = (this.event.areas || []).reduce(
      (acc: number, a: any) => acc + Number(a.maxSeats || 0),
      0
    );

    const totalSoldAllTime = this.allTickets.reduce(
      (acc: number, t: any) =>
        acc + (t.tickets || []).reduce((a: number, b: any) => a + Number(b.qty || 0), 0),
      0
    );

    const originalCapacity = currentRemaining + totalSoldAllTime;

    this.occupancyPercent = originalCapacity > 0 ? Math.round((totalSoldAllTime / originalCapacity) * 100) : 0;

    const { labels, ticketsData, revenueData } = this.groupByDateForCharts(filtered);
    this.renderTicketChart(labels, ticketsData);
    this.renderRevenueChart(labels, revenueData);
    this.renderOccupancyChart(this.allTickets);
  }

  filterTicketsByPeriod(): any[] {
    if (!this.allTickets || this.allTickets.length === 0) return [];

    const arr = this.allTickets.slice();

    if (this.reportPeriod === 'daily') {
      if (!this.filterDate) return arr;
      const sel = new Date(this.filterDate);
      return arr.filter((t: any) => {
        if (!t.date) return false;
        const dt = new Date(t.date);
        return (
          dt.getFullYear() === sel.getFullYear() &&
          dt.getMonth() === sel.getMonth() &&
          dt.getDate() === sel.getDate()
        );
      });
    }

    if (this.reportPeriod === 'monthly') {
      if (!this.filterMonth) return arr;
      const [y, m] = (this.filterMonth || '').split('-').map(Number);
      return arr.filter((t: any) => {
        if (!t.date) return false;
        const dt = new Date(t.date);
        return dt.getFullYear() === y && dt.getMonth() + 1 === m;
      });
    }

    if (this.reportPeriod === 'weekly') {
      if (!this.filterWeekStart) return arr;
      const s = new Date(this.filterWeekStart);
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return arr.filter((t: any) => {
        if (!t.date) return false;
        const dt = new Date(t.date);
        return dt >= s && dt <= e;
      });
    }

    return arr;
  }

  groupByDateForCharts(filtered: any[]) {
    const map = new Map<string, { tickets: number; revenue: number }>();

    for (const t of filtered) {
      const dt = t.date ? new Date(t.date) : null;
      const dstr = dt ? dt.toISOString().slice(0, 10) : 'unknown';
      const qty = (t.tickets || []).reduce((a: number, b: any) => a + Number(b.qty || 0), 0);
      const rev = Number(t.total || 0);

      const cur = map.get(dstr) || { tickets: 0, revenue: 0 };
      cur.tickets += qty;
      cur.revenue += rev;
      map.set(dstr, cur);
    }

    const labels = Array.from(map.keys()).sort();
    const ticketsData = labels.map((l) => map.get(l)!.tickets);
    const revenueData = labels.map((l) => map.get(l)!.revenue);

    if (labels.length === 0) {
      return { labels: ['No data'], ticketsData: [0], revenueData: [0] };
    }

    return { labels, ticketsData, revenueData };
  }

  renderTicketChart(labels: string[], data: number[]) {
    if (this.ticketChart) this.ticketChart.destroy();
    const ctx = document.getElementById('ticketChart') as HTMLCanvasElement;
    this.ticketChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Tickets sold', data, borderRadius: 6 }],
      },
      options: { responsive: false, maintainAspectRatio: false },
    });
  }

  renderRevenueChart(labels: string[], data: number[]) {
    if (this.revenueChart) this.revenueChart.destroy();
    const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Revenue', data, fill: false }],
      },
      options: { responsive: false, maintainAspectRatio: false },
    });
  }

  renderOccupancyChart(tickets: any[]) {
    if (this.occupancyChart) this.occupancyChart.destroy();

    const areas = this.event?.areas || [];

    const currentRemaining: number[] = areas.map((a: any) => Number(a.maxSeats || 0));

    const sold = new Array(areas.length).fill(0);

    for (const p of tickets || []) {
      for (const tk of p.tickets || []) {
        const idx = Number(tk.areaIndex || 0);
        const qty = Number(tk.qty || 0);
        if (idx >= 0 && idx < sold.length) {
          sold[idx] += qty;
        }
      }
    }

    const remaining = currentRemaining;

    const labels = areas.map((a: any, i: number) => a.name || `Area ${i + 1}`);

    const ctx = document.getElementById('occupancyChart') as HTMLCanvasElement;

    this.occupancyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Sold',
            data: sold,
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
          },
          {
            label: 'Remaining',
            data: remaining,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Seats' },
          },
        },
      },
    });
  }

  async downloadPDF() {
    const el = document.getElementById('analyticsWrap')!;
    if (!el) return;

    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = canvas as any;
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
    pdf.save(`analytics_${this.event.title || this.event.id}.pdf`);
  }

  goBack() {
    window.history.back();
  }
}
