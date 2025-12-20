import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [RouterLink, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {

  user: any = null;

  ngOnInit() {
    const data = localStorage.getItem('loggedUser');
    this.user = data ? JSON.parse(data) : null;
  }

  logout() {
    localStorage.removeItem('loggedUser');
    window.location.href = '/login';
  }

}
