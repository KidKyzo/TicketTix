import { Routes } from '@angular/router';
import { BrowseEventPage } from './pages/browse-page/browse';
import { CreateEventPageComponent } from './pages/create-event-page/create-event';
import { Home } from './pages/home/home';
import { LoginPageComponent } from './pages/login-page/login';
import { MyTicketPages } from './pages/my-ticket-pages/my-ticket-pages';
import { OrganizerDashboardPage } from './pages/organizer-dashboard/organizer-dashboard';
import { RegisterOrganizer } from './pages/register-organizer/register-organizer';
import { EventDetails } from './shared/event-details/event-details';
import { EditEventPage } from './pages/edit-event/edit-event';
import { TicketPage } from './pages/buy-ticket/buy-ticket';
import { AdminDashboardPage } from './pages/admin-dashboard/admin-dashboard';
import { AnalyticsPage } from './pages/analytics-page/analytics-page';
import { WaitlistPage } from './pages/waitlist-page/waitlist-page';
import { RegisterAttendeePage } from './pages/register-attendee/register-attendee';
import { ChangePasswordPage } from './pages/change-password/change-password';
import { PaymentPage } from './pages/payment-page/payment-page';

export const routes: Routes = [
  { path: '', component: Home },

  { path: 'event-details/:id', component: EventDetails },

  { path: 'login', component: LoginPageComponent },

  { path: 'register-organizer', component: RegisterOrganizer },

  { path: 'register-attendee', component: RegisterAttendeePage },

  { path: 'change-password', component: ChangePasswordPage },

  { path: 'payment', component: PaymentPage },

  { path: 'organizer-dashboard', component: OrganizerDashboardPage },

  { path: 'create-event', component: CreateEventPageComponent },

  { path: 'browse-events', component: BrowseEventPage },

  { path: 'my-tickets', component: MyTicketPages },

  { path: 'edit-event/:id', component: EditEventPage },

  { path: 'buy-ticket/:id', component: TicketPage },

  { path: 'admin-dashboard', component: AdminDashboardPage },

  {
    path: 'analytics/:id',
    loadComponent: () =>
      import('./pages/analytics-page/analytics-page').then((m) => m.AnalyticsPage),
  },

  {
    path: 'waitlist/:id',
    loadComponent: () => import('./pages/waitlist-page/waitlist-page').then((m) => m.WaitlistPage),
  },
];
