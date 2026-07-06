import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { MOCK_TRAVELER } from '@app/core/data/mock-data';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, NgIconComponent, HlmButtonImports],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-2xl font-bold">Profile</h1>

      <!-- Profile card -->
      <div class="bg-card border border-border rounded-xl p-6">
        <div class="flex items-start gap-5">
          <div class="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold flex-shrink-0">
            {{ user.name.charAt(0) }}
          </div>
          <div class="flex-1">
            <div class="text-xl font-bold">{{ user.name }}</div>
            <div class="text-muted-foreground flex items-center gap-1 mt-1">
              <ng-icon name="lucideMail" size="12" /> {{ user.email }}
            </div>
            <div class="text-muted-foreground flex items-center gap-1 mt-1">
              <ng-icon name="lucidePhone" size="12" /> {{ user.phone }}
            </div>
            <div class="text-xs text-muted-foreground mt-2">
              Member since {{ user.createdAt | date:'MMMM yyyy' }}
            </div>
          </div>
          <button hlmBtn variant="outline" size="sm">
            <ng-icon name="lucidePencil" size="12" class="mr-1.5" />
            Edit Profile
          </button>
        </div>
      </div>

      <!-- Role info -->
      <div class="bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-3">Account Details</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Role</span>
            <span class="text-sm font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{{ user.role }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Account ID</span>
            <span class="text-xs font-mono text-muted-foreground">{{ user.id }}</span>
          </div>
        </div>
      </div>

      <!-- Change password -->
      <div class="bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-3">Security</h2>
        <button hlmBtn variant="outline" size="sm">
          <ng-icon name="lucideLock" size="12" class="mr-1.5" />
          Change Password
        </button>
      </div>
    </div>
  `,
})
export class Profile {
  readonly user = MOCK_TRAVELER;
}
