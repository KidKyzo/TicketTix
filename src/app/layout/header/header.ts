import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [RouterLink, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  user: any = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    // Only access localStorage in the browser, not during SSR
    if (isPlatformBrowser(this.platformId)) {
      const data = localStorage.getItem('logged_user');
      this.user = data ? JSON.parse(data) : null;
    }
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('logged_user');
      localStorage.removeItem('user_role');
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  }
}
