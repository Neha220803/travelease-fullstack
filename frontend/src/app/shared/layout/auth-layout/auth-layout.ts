import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeToggle } from '@app/shared/ui/theme-toggle/theme-toggle';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, RouterOutlet, ThemeToggle],
  templateUrl: './auth-layout.html',
})
export class AuthLayout {}
