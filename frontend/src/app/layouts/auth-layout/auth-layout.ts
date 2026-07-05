import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, NgIconComponent],
  template: `
    <div class="min-h-screen flex">
      <!-- Left panel — brand hero -->
      <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden"
           style="background: linear-gradient(135deg, oklch(0.38 0.14 185) 0%, oklch(0.52 0.14 185) 50%, oklch(0.55 0.16 200) 100%);">
        <div class="absolute inset-0 opacity-10"
             style="background-image: radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px); background-size: 60px 60px;">
        </div>
        <div class="relative z-10 flex flex-col justify-between p-12 text-white">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <ng-icon name="lucidePlane" class="text-white" size="20" />
            </div>
            <span class="text-2xl font-bold tracking-tight">TravelEase</span>
          </div>

          <div class="space-y-6">
            <h1 class="text-4xl font-bold leading-tight">
              Plan trips.<br>Share memories.<br>Travel smarter.
            </h1>
            <p class="text-white/75 text-lg leading-relaxed max-w-sm">
              A modern platform that brings your travel group together — from booking to splitting bills.
            </p>
            <div class="grid grid-cols-2 gap-4 pt-4">
              @for (stat of stats; track stat.label) {
                <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div class="text-2xl font-bold">{{ stat.value }}</div>
                  <div class="text-white/70 text-sm mt-1">{{ stat.label }}</div>
                </div>
              }
            </div>
          </div>

          <p class="text-white/50 text-sm">
            © 2026 TravelEase. All rights reserved.
          </p>
        </div>
      </div>

      <!-- Right panel — form -->
      <div class="flex-1 flex items-center justify-center p-6 bg-background">
        <div class="w-full max-w-md">
          <!-- Mobile logo -->
          <div class="flex items-center gap-2 mb-8 lg:hidden">
            <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ng-icon name="lucidePlane" class="text-primary-foreground" size="16" />
            </div>
            <span class="text-xl font-bold">TravelEase</span>
          </div>
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class AuthLayout {
  readonly stats = [
    { value: '50K+', label: 'Happy Travelers' },
    { value: '1,200+', label: 'Destinations' },
    { value: '98%', label: 'Satisfaction Rate' },
    { value: '4.9★', label: 'App Rating' },
  ];
}
