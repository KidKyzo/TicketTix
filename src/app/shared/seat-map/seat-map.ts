import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Seat {
  id: string; // e.g., "A1", "B2"
  row: number;
  col: number;
  rowLabel: string; // A, B, C, D...
  status: SeatStatus;
  price: number;
  area: 'balcony' | 'lower';
}

export type SeatStatus = 'available' | 'selected' | 'reserved' | 'sold';

export interface AreaConfig {
  name: string;
  rows: number;
  cols: number;
  price: number;
  soldSeats?: string[];
  startIndex?: number; // For sequential numbering (e.g. start at 1 for A1, 201 for A201)
}

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seat-map.html',
  styleUrls: ['./seat-map.css'],
})
export class SeatMapComponent implements OnInit, OnChanges {
  @Input() balconyConfig: AreaConfig = { name: 'Balcony', rows: 10, cols: 10, price: 0 };
  @Input() lowerConfig: AreaConfig = { name: 'Lower Foyer', rows: 20, cols: 10, price: 0 };
  @Input() maxSelection: number = 10;
  @Input() disabled: boolean = false;

  @Output() selectionChange = new EventEmitter<Seat[]>();
  @Output() totalChange = new EventEmitter<number>();

  balconySeats: Seat[][] = [];
  lowerSeats: Seat[][] = [];
  selectedSeats: Seat[] = [];

  // Row labels: A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T
  rowLabels: string[] = 'ABCDEFGHIJKLMNOPQRST'.split('');

  ngOnInit() {
    this.initializeSeats();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['balconyConfig'] || changes['lowerConfig']) {
      this.initializeSeats();
    }
  }

  initializeSeats() {
    this.balconySeats = this.generateSeats(this.balconyConfig, 'balcony');
    this.lowerSeats = this.generateSeats(this.lowerConfig, 'lower');
    this.selectedSeats = [];
    this.emitChanges();
  }

  generateSeats(config: AreaConfig, area: 'balcony' | 'lower'): Seat[][] {
    const seats: Seat[][] = [];
    const soldSet = new Set(config.soldSeats || []);

    // Sequential numbering counter if startIndex is provided
    let counter = config.startIndex || 1;

    for (let r = 0; r < config.rows; r++) {
      const row: Seat[] = [];
      const rowLabel = this.rowLabels[r] || String.fromCharCode(65 + r);

      for (let c = 0; c < config.cols; c++) {
        let seatId = '';

        if (config.startIndex !== undefined) {
          // Sequential: A1, A2... based on counter
          seatId = `A${counter}`;
          counter++;
        } else {
          // Grid: A1, A2 (Row A, Col 1..)
          seatId = `${rowLabel}${c + 1}`;
        }

        const isSold = soldSet.has(seatId);

        row.push({
          id: seatId,
          row: r + 1,
          col: c + 1,
          rowLabel: rowLabel,
          status: isSold ? 'sold' : 'available',
          price: config.price,
          area: area,
        });
      }
      seats.push(row);
    }
    return seats;
  }

  toggleSeat(seat: Seat) {
    if (this.disabled) return;
    if (seat.status === 'sold' || seat.status === 'reserved') return;

    if (seat.status === 'selected') {
      seat.status = 'available';
      this.selectedSeats = this.selectedSeats.filter(
        (s) => !(s.id === seat.id && s.area === seat.area)
      );
    } else if (seat.status === 'available') {
      if (this.selectedSeats.length >= this.maxSelection) {
        alert(`Maximum ${this.maxSelection} seats allowed.`);
        return;
      }
      seat.status = 'selected';
      this.selectedSeats.push(seat);
    }

    this.emitChanges();
  }

  emitChanges() {
    this.selectionChange.emit([...this.selectedSeats]);
    const total = this.selectedSeats.reduce((sum, s) => sum + s.price, 0);
    this.totalChange.emit(total);
  }

  getSeatClass(seat: Seat): string {
    let classes = 'seat';
    classes += ` seat-${seat.status}`;
    if (this.disabled && seat.status !== 'sold') {
      classes += ' seat-disabled';
    }
    return classes;
  }

  getSelectedCount(area: 'balcony' | 'lower'): number {
    return this.selectedSeats.filter((s) => s.area === area).length;
  }

  getAvailableCount(seats: Seat[][]): number {
    return seats.flat().filter((s) => s.status === 'available').length;
  }

  getSoldCount(seats: Seat[][]): number {
    return seats.flat().filter((s) => s.status === 'sold').length;
  }

  clearSelection() {
    for (const seat of this.selectedSeats) {
      seat.status = 'available';
    }
    this.selectedSeats = [];
    this.emitChanges();
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('id-ID').format(price);
  }

  getColNumbers(cols: number): number[] {
    return Array.from({ length: cols }, (_, i) => i + 1);
  }
}
