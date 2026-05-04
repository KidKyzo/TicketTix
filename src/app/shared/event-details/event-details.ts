import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../services/storage.service';
import { Event } from '../../models/event.model';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './event-details.html',
  styleUrls: ['./event-details.css'],
})
export class EventDetails implements OnInit {
  event: any = null;
  id: string = '';
  isLoading: boolean = true;
  notFound: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private storage: StorageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.loadEvent();
  }

  loadEvent() {
    if (!this.id) {
      this.showNotFound();
      return;
    }

    this.storage.getEventById(this.id).subscribe({
      next: (event) => {
        this.event = event;
        this.isLoading = false;
        this.notFound = false;
        // Manually trigger change detection
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Failed to load event details:', err);
        this.showNotFound();
      },
    });
  }

  showNotFound() {
    this.event = {
      title: 'Event Not Found',
      event_name: 'Event Not Found',
      description: 'This event does not exist.',
      image: '',
      date: '',
      time: '',
      location: '',
    };
    this.isLoading = false;
    this.notFound = true;
    this.cdr.detectChanges();
  }
}
