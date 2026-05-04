import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type RowData = { left: string[]; middle: string[]; right: string[]; label: string };

@Component({
  selector: 'app-seating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'seating.html',
  styleUrls: ['seating.css']
})
export class SeatingComponent {
  // approx totals (edit to exact if you have)
  private specTotals: Record<string, number> = {
    A:46, B:46, C:45, D:46, E:41, F:41, G:41, H:39, I:36, J:33, K:28, L:24
  };

  // example sold seats (edit as needed)
  sold = new Set(['A15','A16','D7','D8','D9','D10']);

  // override exact arrays (if you need absolute control)
  overrides: Record<string, Partial<RowData>> = {
    // e.g. 'A': { left: ['A47','A46',...], middle: [...], right: [...] }
  };

  rowsData: RowData[] = [];

  constructor(){
    // build rowsData from specTotals (region-based numbering)
    Object.keys(this.specTotals).forEach((label) => {
      const total = this.specTotals[label];
      const middle = Math.round(total * 0.55);
      const remainder = total - middle;
      const leftCount = Math.ceil(remainder / 2);
      const rightCount = remainder - leftCount;

      // right ascending
      const right = Array.from({length:rightCount}, (_,i)=> `${label}${i+1}`);

      // middle descending
      const middleArr = [];
      for(let i = rightCount + middle; i> rightCount; i--) middleArr.push(`${label}${i}`);

      // left descending
      const leftArr = [];
      for(let i = rightCount + middle + leftCount; i> rightCount+middle; i--) leftArr.push(`${label}${i}`);

      const data: RowData = {
        label,
        left: leftArr,
        middle: middleArr,
        right
      };

      // apply override if exists
      if(this.overrides[label]) {
        const o = this.overrides[label];
        data.left = o.left ?? data.left;
        data.middle = o.middle ?? data.middle;
        data.right = o.right ?? data.right;
      }

      this.rowsData.push(data);
    });
  }

  // selected seats
  selected = new Set<string>();

  toggle(seatLabel: string) {
    if(this.sold.has(seatLabel)) return;
    if(this.selected.has(seatLabel)) this.selected.delete(seatLabel);
    else this.selected.add(seatLabel);
  }

  isSold(label: string){ return this.sold.has(label); }
  isSelected(label: string){ return this.selected.has(label); }
}
