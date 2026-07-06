import { Component } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { hotels } from '@app/core/mock-data';

@Component({
  selector: 'app-admin-hotels',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    PageHeader,
  ],
  templateUrl: './admin-hotels.html',
})
export class AdminHotels {
  public readonly hotels = hotels;
}
