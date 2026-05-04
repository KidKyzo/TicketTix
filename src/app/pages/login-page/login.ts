import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class LoginPageComponent {
  role: string = 'attendee';
  email: string = '';
  password: string = '';
  isLoading: boolean = false;

  constructor(private storage: StorageService) {}

  setRole(role: string) {
    this.role = role;
  }

  login() {
    if (!this.email || !this.password) {
      alert('Please enter email and password');
      return;
    }

    this.isLoading = true;

    this.storage.login(this.email, this.password, this.role).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          const user = response.user;

          // Route based on role
          if (this.role === 'attendee') {
            alert('Logged in as Attendee');
            window.location.href = '/';
          } else if (this.role === 'organizer') {
            // Check if first login (backend returns is_first_login)
            // Note: Backend field is 'is_first_login', frontend might need to check that
            if (user.is_first_login) {
              alert(
                'Welcome! For security, you must change your password before accessing the dashboard.'
              );
              window.location.href = '/change-password';
            } else {
              alert('Logged in as Event Organizer');
              window.location.href = '/organizer-dashboard';
            }
          } else if (this.role === 'admin') {
            alert('Logged in as Admin');
            window.location.href = '/admin-dashboard';
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login error:', err);
        const msg = err.error?.message || 'Login failed. Please check your credentials.';
        alert(msg);
      },
    });
  }
}
