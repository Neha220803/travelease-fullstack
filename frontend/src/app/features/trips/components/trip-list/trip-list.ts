import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-trip-list',
  imports: [RouterLink],
  templateUrl: './trip-list.html',
  styleUrl: './trip-list.css',
})
export class TripList {}
