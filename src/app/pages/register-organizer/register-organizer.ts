import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../services/storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-organizer',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register-organizer.html',
  styleUrls: ['./register-organizer.css'],
})
export class RegisterOrganizer {
  name: string = '';
  email: string = '';
  phone: string = '';
  organization: string = '';
  description: string = '';

  isSubmitting: boolean = false;

  constructor(private storage: StorageService, private router: Router) {}

  submitForm() {
    if (this.isSubmitting) return;

    if (!this.name.trim()) {
      alert('Full Name is required.');
      return;
    }

    if (!this.email.trim()) {
      alert('Email is required.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (!this.phone.trim()) {
      alert('Phone Number is required.');
      return;
    }

    if (!this.organization.trim()) {
      alert('Organization name is required.');
      return;
    }

    if (!this.description.trim()) {
      alert('Please describe why you want to become an organizer.');
      return;
    }

    this.isSubmitting = true;

    this.storage
      .addOrganizerApplication({
        name: this.name.trim(),
        email: this.email.trim(),
        phone: this.phone.trim(),
        organization: this.organization.trim(),
        description: this.description.trim(),
      })
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert(
              'Your organizer application has been submitted!\n\nStatus: PENDING\n\nPlease wait for admin approval. You will be able to login once approved.'
            );
            this.router.navigate(['/']);
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Application error:', err);
          const msg = err.error?.message || 'Failed to submit application. Please try again.';
          alert(msg);
        },
      });
  }
}
