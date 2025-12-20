import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home {
  data: any[] = [];

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    const stored = localStorage.getItem('organizer_events');
    this.data = stored ? JSON.parse(stored) : [];

    this.data = this.data.slice(0, 6);
  }
}
