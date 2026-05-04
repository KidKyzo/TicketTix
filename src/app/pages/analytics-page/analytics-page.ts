import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
  analyticsData: any = null;
  categoryBreakdown: any[] = [];
  isLoading = true;

  reportPeriod: 'daily' | 'weekly' | 'monthly' | 'select' = 'select'; // Default to select (acts as daily)
  filterDate: string = '';
  filterWeekStart: string = '';
  filterMonth: string = '';

  // All-time stats from API
  totalTicketsAllTime = 0;
  totalRevenueAllTime = 0;
  occupancyPercent = 0;

  // Period-specific stats for display
  totalTickets = 0;
  totalRevenue = 0;

  ticketChart: any = null;
  revenueChart: any = null;
  occupancyChart: any = null;

  private apiUrl = 'http://localhost:3000/api';
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.reportPeriod = 'select'; // Ensure default is set to select
    const eventId = this.route.snapshot.paramMap.get('id') || '';

    if (!eventId) {
      alert('Event ID is required');
      this.router.navigate(['/']);
      return;
    }

    // Initialize date filters
    const today = new Date();
    this.filterDate = today.toISOString().slice(0, 10);
    this.filterMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Calculate Monday of current week
    const day = today.getDay();
    const monday = new Date(today);
    const diff = (day + 6) % 7;
    monday.setDate(today.getDate() - diff);
    this.filterWeekStart = monday.toISOString().slice(0, 10);

    // Fetch analytics data from backend
    this.loadAnalytics(eventId);
    document.body.classList.add('hide-layout');
  }

  loadAnalytics(eventId: string) {
    this.isLoading = true;
    this.http.get(`${this.apiUrl}/events/${eventId}/analytics`).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.analyticsData = response.analytics;

          // Store categoryBreakdown directly from API
          this.categoryBreakdown = this.analyticsData.categoryBreakdown || [];

          // Map event data
          this.event = {
            id: this.analyticsData.event.id,
            title: this.analyticsData.event.name,
            event_name: this.analyticsData.event.name,
            date: this.analyticsData.event.date,
            time: this.analyticsData.event.time,
            location: this.analyticsData.event.location,
            totalCapacity: this.analyticsData.event.totalCapacity || 300,
          };

          // Store all-time stats from API
          this.totalTicketsAllTime = this.analyticsData.summary.totalTicketsSold || 0;
          this.totalRevenueAllTime = this.analyticsData.summary.totalRevenue || 0;
          this.occupancyPercent = this.analyticsData.summary.occupancyPercent || 0;

          // Recalculate occupancy from all-time data to be robust
          if (this.event.totalCapacity > 0) {
            this.occupancyPercent = Math.round((this.totalTicketsAllTime / this.event.totalCapacity) * 100);
          }

          // Map transactions for period filtering
          this.allTickets = this.analyticsData.transactions.map((t: any) => ({
            eventId: this.event.id,
            date: t.created_at,
            total: t.amount,
            ticketCount: t.seats?.length || 0,
            seats: t.seats || [],
          }));

          // If daily view (or select) and no data for today, switch to latest available date
          if ((this.reportPeriod === 'daily' || this.reportPeriod === 'select') && this.allTickets.length > 0) {
            const todayStr = this.filterDate;
            const hasToday = this.allTickets.some(t => {
              if (!t.date) return false;
              const dt = new Date(t.date);
              return dt.toISOString().slice(0, 10) === todayStr;
            });

            if (!hasToday) {
              // Find latest date
              const sorted = [...this.allTickets].sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              const latest = sorted[0];
              if (latest && latest.date) {
                const latestDate = new Date(latest.date);
                this.filterDate = latestDate.toISOString().slice(0, 10);
                
                // Update other filters for consistency
                this.filterMonth = `${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(2, '0')}`;
                
                const day = latestDate.getDay();
                const monday = new Date(latestDate);
                const diff = (day + 6) % 7; 
                monday.setDate(latestDate.getDate() - diff);
                this.filterWeekStart = monday.toISOString().slice(0, 10);
              }
            }
          }

          this.isLoading = false;
          
          // Use setTimeout to push update to next tick to ensure UI binding updates
          setTimeout(() => {
            this.regenerate();
            this.cdr.detectChanges();
          }, 0);
        }
      },
      error: (err) => {
        console.error('Failed to load analytics:', err);
        alert('Failed to load analytics data. Please try again.');
        this.isLoading = false;
        this.router.navigate(['/organizer-dashboard']);
      },
    });
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
    } else if (this.reportPeriod === 'monthly') {
      this.filterMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }
    this.regenerate();
    this.cdr.detectChanges();
  }

  regenerate() {
    const filtered = this.filterTicketsByPeriod();

    // Calculate period-specific stats
    this.totalTickets = filtered.reduce(
      (acc: number, t: any) => acc + (t.ticketCount || 0),
      0
    );

    this.totalRevenue = filtered.reduce(
      (acc: number, t: any) => acc + Number(t.total || 0),
      0
    );


    const { labels, ticketsData, revenueData } = this.groupByDateForCharts(filtered);
    this.renderTicketChart(labels, ticketsData);
    this.renderRevenueChart(labels, revenueData);
    this.renderOccupancyChart();
  }

  filterTicketsByPeriod(): any[] {
    if (!this.allTickets || this.allTickets.length === 0) return [];

    const arr = this.allTickets.slice();


    if (this.reportPeriod === 'daily' || this.reportPeriod === 'select') {
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
      const qty = t.ticketCount || 0;
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

    // Format labels for better display
    const formattedLabels = labels.map(l => {
      if (l === 'No data' || l === 'unknown') return l;
      const d = new Date(l);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    });

    return { labels: formattedLabels, ticketsData, revenueData };
  }

  renderTicketChart(labels: string[], data: number[]) {
    if (this.ticketChart) this.ticketChart.destroy();
    const ctx = document.getElementById('ticketChart') as HTMLCanvasElement;
    if (!ctx) return;

    // Gradient background
    const gradient = ctx.getContext('2d')!.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 188, 212, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 150, 170, 0.6)');

    this.ticketChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Tickets Sold',
          data,
          borderRadius: 8,
          backgroundColor: gradient,
          borderColor: 'rgba(0, 188, 212, 1)',
          borderWidth: 2,
          barThickness: 40,
          maxBarThickness: 50
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { size: 12, weight: 'bold' },
              color: '#333'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              stepSize: 1,
              font: { size: 11 },
              color: '#666'
            },
            title: {
              display: true,
              text: 'Tickets',
              font: { size: 12, weight: 'bold' },
              color: '#333'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              color: '#666'
            }
          }
        }
      },
    });
  }

  renderRevenueChart(labels: string[], data: number[]) {
    if (this.revenueChart) this.revenueChart.destroy();
    const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!ctx) return;

    // Gradient fill
    const gradient = ctx.getContext('2d')!.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(76, 175, 80, 0.4)');
    gradient.addColorStop(1, 'rgba(76, 175, 80, 0.05)');

    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (Rp)',
          data,
          fill: true,
          backgroundColor: gradient,
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 3,
          tension: 0.4,
          pointBackgroundColor: 'rgba(76, 175, 80, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { size: 12, weight: 'bold' },
              color: '#333'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function (context: any) {
                return 'Rp ' + context.parsed.y.toLocaleString('en-US');
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              font: { size: 11 },
              color: '#666',
              callback: function (value: any) {
                return 'Rp ' + (value / 1000).toFixed(0) + 'K';
              }
            },
            title: {
              display: true,
              text: 'Revenue',
              font: { size: 12, weight: 'bold' },
              color: '#333'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              color: '#666'
            }
          }
        }
      },
    });
  }

  renderOccupancyChart() {
    if (this.occupancyChart) this.occupancyChart.destroy();

    const ctx = document.getElementById('occupancyChart') as HTMLCanvasElement;
    if (!ctx) return;

    const categories = this.categoryBreakdown;

    if (!categories || categories.length === 0) {
      this.occupancyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['No data'],
          datasets: [{
            data: [1],
            backgroundColor: ['rgba(200, 200, 200, 0.5)']
          }],
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false },
      });
      return;
    }

    // Create labels with category name and percentage
    const labels = categories.map((cat: any) => {
      const total = (cat.sold || 0) + (cat.available || 0);
      const percent = total > 0 ? Math.round((cat.sold / total) * 100) : 0;
      return `${cat.name} (${percent}% sold)`;
    });

    const soldData = categories.map((cat: any) => cat.sold || 0);
    const availableData = categories.map((cat: any) => cat.available || 0);

    // Beautiful color palette
    const soldColors = [
      'rgba(255, 99, 132, 0.85)',
      'rgba(255, 159, 64, 0.85)',
      'rgba(153, 102, 255, 0.85)',
      'rgba(255, 205, 86, 0.85)',
      'rgba(75, 192, 192, 0.85)',
    ];

    const availableColors = [
      'rgba(54, 162, 235, 0.85)',
      'rgba(100, 181, 246, 0.85)',
      'rgba(129, 199, 132, 0.85)',
      'rgba(144, 202, 249, 0.85)',
      'rgba(128, 222, 234, 0.85)',
    ];

    // Create combined data for a grouped bar chart
    this.occupancyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categories.map((cat: any) => cat.name),
        datasets: [
          {
            label: 'Sold',
            data: soldData,
            backgroundColor: soldColors.slice(0, categories.length),
            borderColor: soldColors.map(c => c.replace('0.85', '1')),
            borderWidth: 2,
            borderRadius: 6
          },
          {
            label: 'Available',
            data: availableData,
            backgroundColor: availableColors.slice(0, categories.length),
            borderColor: availableColors.map(c => c.replace('0.85', '1')),
            borderWidth: 2,
            borderRadius: 6
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        indexAxis: 'y', // Horizontal bar chart for better readability
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 12, weight: 'bold' },
              color: '#333',
              padding: 15,
              usePointStyle: true,
              pointStyle: 'rectRounded'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            padding: 14,
            cornerRadius: 10,
            callbacks: {
              afterLabel: function (context: any) {
                const datasetIndex = context.datasetIndex;
                const index = context.dataIndex;
                const sold = soldData[index];
                const available = availableData[index];
                const total = sold + available;
                if (datasetIndex === 0) {
                  return `${Math.round((sold / total) * 100)}% of capacity`;
                }
                return `${Math.round((available / total) * 100)}% remaining`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            title: {
              display: true,
              text: 'Number of Seats',
              font: { size: 12, weight: 'bold' },
              color: '#333'
            },
            ticks: {
              font: { size: 11 },
              color: '#666'
            }
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: {
              font: { size: 12, weight: 'bold' },
              color: '#333'
            }
          }
        }
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

    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
    pdf.save(`analytics_${this.event.title || this.event.id}.pdf`);
  }

  goBack() {
    const role = localStorage.getItem('user_role');
    if (role === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else {
      this.router.navigate(['/organizer-dashboard']);
    }
  }
}
