import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.css'],
})
export class ChangePasswordPage implements OnInit {
  newPassword: string = '';
  confirmPassword: string = '';
  isSubmitting: boolean = false;
  userEmail: string = '';

  constructor(private router: Router, private storage: StorageService) {}

  ngOnInit() {
    const logged = this.storage.getLoggedUser();

    if (!logged || logged.role !== 'organizer') {
      alert('Access denied. Organizer login required.');
      this.router.navigate(['/login']);
      return;
    }

    // Since we redirected here from login/dashboard based on flag,
    // we assume the user is here for a reason.
    // We can also check logged.is_first_login if we saved it in session.

    this.userEmail = logged.email;
  }

  changePassword() {
    if (this.isSubmitting) return;

    if (!this.newPassword || this.newPassword.length < 6) {
      alert('New password must be at least 6 characters.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    this.isSubmitting = true;

    this.storage.updateOrganizerPassword(this.userEmail, this.newPassword).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Password changed successfully! Please login again.');
          // Session is cleared in service (if implemented there) or we force logout here
          this.storage.logout();
          window.location.href = '/login';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Change password error:', err);
        const msg = err.error?.message || 'Failed to change password.';
        alert(msg);
      },
    });
  }
}
