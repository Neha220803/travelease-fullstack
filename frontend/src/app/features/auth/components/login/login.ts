import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = '';
  loading = false;

  login() {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return;
    }
    
    this.loading = true;
    this.error = '';
    
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response: any) => {
        // If the backend returns a token, save it (AuthService should already do this but let's double check it does)
        if (response?.data?.token) {
          localStorage.setItem('jwtToken', response.data.token);
        }
        this.router.navigate(['/trips']); // Redirect to traveler dashboard
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Invalid email or password';
        this.loading = false;
      }
    });
  }
}
