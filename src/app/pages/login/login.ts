// import { Component } from '@angular/core';
// import { FormsModule } from '@angular/forms';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-login',
//   imports: [FormsModule],
//   templateUrl: './login.html',
//   styleUrl: './login.css',
// })
// export class Login {


//   email = "";
//   password = "";
//   showPassword = false;

//   constructor(private router: Router) {}

//   togglePassword() {
//     this.showPassword = !this.showPassword;
//   }

//   onLogin() {
//     // sementara (belum backend)
//     if (this.email && this.password) {
//       this.router.navigate(['/']);
//     }
//   }
// }

import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  
  email: string = "";
  password: string = "";

  constructor(private router: Router) {}

  login() {
    console.log("Login email:", this.email);
    console.log("Password:", this.password);

    this.router.navigate(['/']);
  }

}
