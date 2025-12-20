import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-browse-events',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './browse.html',
  styleUrls: ['./browse.css'],
})
export class BrowseEventPage {
  events: any[] = [];

  constructor(private storage: StorageService) {}

  ngOnInit() {
    this.storage.getEvents().subscribe({
      next: (events) => {
        this.events = events;
      },
      error: (err) => console.error('Failed to load events', err),
    });
  }
}
