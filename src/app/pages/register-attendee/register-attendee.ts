import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-register-attendee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-attendee.html',
  styleUrls: ['./register-attendee.css'],
})
export class RegisterAttendeePage {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  isSubmitting: boolean = false;

  constructor(private router: Router, private storage: StorageService) {}

  register() {
    if (this.isSubmitting) return;

    if (!this.name.trim()) {
      alert('Name is required.');
      return;
    }

    if (!this.email.trim()) {
      alert('Email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (!this.password || this.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    this.isSubmitting = true;

    this.storage
      .registerAttendee({
        name: this.name.trim(),
        email: this.email.trim(),
        password: this.password,
      })
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert('Registration successful! You can now login.');
            this.router.navigate(['/login']);
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Registration error:', err);
          const msg = err.error?.message || 'Registration failed. Please try again.';
          alert(msg);
        },
      });
  }
}
