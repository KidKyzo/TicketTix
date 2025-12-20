import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './event-details.html',
  styleUrls: ['./event-details.css'],
})
export class EventDetails implements OnInit {
  event: any = {};
  id: number = 0;

  constructor(
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadEvent();
  }

  loadEvent() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('organizer_events');
      const events = stored ? JSON.parse(stored) : [];

      this.event = events.find((e: any) => e.id == this.id);

      if (!this.event) {
        this.event = {
          title: 'Event Not Found',
          description: 'This event does not exist.',
          image: '',
          date: '',
          time: '',
          location: '',
        };
      }
    }
  }
}
