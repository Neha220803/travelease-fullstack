import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { WorkspaceSearchService } from '@app/shared/services/workspace-search.service';
import {
  EMPTY_PROVIDER_OVERVIEW,
  HotelRequest,
  HotelProviderService,
} from '@app/features/hotel/services/hotel-provider.service';
import {
  HotelCardView,
  filterHotelCards,
  mapHotelCards,
} from '@app/features/hotel/services/hotel-provider-view-models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';
import { catchError, combineLatest, of } from 'rxjs';

@Component({
  selector: 'app-hotel-properties',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmBadgeImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmTextareaImports,
    HlmSelectImports,
    PageHeader,
  ],
  templateUrl: './hotel-properties.html',
})
export class HotelProperties {
  private readonly hotelProvider = inject(HotelProviderService);
  private readonly workspaceSearch = inject(WorkspaceSearchService);
  private readonly destinationsService = inject(DestinationsService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly hotels = signal<HotelCardView[]>([]);
  public readonly addPropertyDialogState = signal<BrnDialogState>('closed');
  public readonly editPropertyDialogState = signal<BrnDialogState>('closed');
  public readonly editingHotel = signal<HotelCardView | null>(null);
  public readonly savingProperty = signal(false);
  public readonly savingEditProperty = signal(false);
  public readonly propertyError = signal('');
  public readonly propertySuccess = signal('');
  public readonly editPropertyError = signal('');
  public readonly editPropertySuccess = signal('');

  public readonly destinations = signal<Destination[]>([]);
  public readonly destinationsLoading = signal(true);
  public readonly destinationsError = signal(false);
  public readonly newDestinationId = signal('');
  public readonly editDestinationId = signal('');

  constructor() {
    this.watchProperties();
    this.destinationsService
      .listDestinations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (destinations) => {
          this.destinations.set(destinations);
          this.destinationsLoading.set(false);
          if (destinations.length > 0) {
            this.newDestinationId.set(String(destinations[0].destinationId));
          }
        },
        error: () => {
          this.destinationsError.set(true);
          this.destinationsLoading.set(false);
        },
      });
  }

  public destinationLabel(destination: Destination): string {
    return `${destination.destinationName}, ${destination.state}`;
  }

  public readonly destinationIdToLabel = (id: string): string => {
    const destination = this.destinations().find((d) => String(d.destinationId) === id);
    return destination ? this.destinationLabel(destination) : id;
  };

  public onNewDestinationChange(value: string | null | undefined): void {
    if (value) {
      this.newDestinationId.set(value);
    }
  }

  public onEditDestinationChange(value: string | null | undefined): void {
    if (value) {
      this.editDestinationId.set(value);
    }
  }

  public setAddPropertyDialogState(state: BrnDialogState): void {
    this.addPropertyDialogState.set(state);
    if (state === 'open') {
      this.propertyError.set('');
      this.propertySuccess.set('');
      const destinations = this.destinations();
      if (destinations.length > 0) {
        this.newDestinationId.set(String(destinations[0].destinationId));
      }
    }
  }

  public setEditPropertyDialogState(state: BrnDialogState): void {
    this.editPropertyDialogState.set(state);
    if (state === 'closed' && !this.savingEditProperty()) {
      this.editingHotel.set(null);
    }
    if (state === 'open') {
      this.editPropertyError.set('');
      this.editPropertySuccess.set('');
    }
  }

  public openEditProperty(hotel: HotelCardView): void {
    this.editingHotel.set(hotel);
    this.editDestinationId.set(String(hotel.destinationId));
    this.editPropertyError.set('');
    this.editPropertySuccess.set('');
    this.editPropertyDialogState.set('open');
  }

  public createProperty(
    event: SubmitEvent,
    form: HTMLFormElement,
    destinationId: string,
    hotelName: string,
    address: string,
    pricePerNight: string,
    amenities: string,
    status: string,
  ): void {
    event.preventDefault();
    this.propertyError.set('');
    this.propertySuccess.set('');

    const request = this.buildPropertyRequest(
      destinationId,
      hotelName,
      address,
      pricePerNight,
      amenities,
      status,
      null,
    );

    if (!request.destinationId || !request.hotelName || !request.address || !request.pricePerNight) {
      this.propertyError.set('Fill the required property details.');
      return;
    }

    this.savingProperty.set(true);
    this.hotelProvider
      .createHotel(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          form.reset();
          this.addPropertyDialogState.set('closed');
          this.propertySuccess.set('Property saved to database.');
          this.hotelProvider.refreshProviderData();
        },
        error: (error: unknown) => {
          this.propertyError.set(error instanceof Error ? error.message : 'Could not save property.');
          this.savingProperty.set(false);
        },
        complete: () => {
          this.savingProperty.set(false);
        },
      });
  }

  public updateProperty(
    event: SubmitEvent,
    form: HTMLFormElement,
    hotel: HotelCardView,
    destinationId: string,
    hotelName: string,
    address: string,
    pricePerNight: string,
    amenities: string,
    status: string,
  ): void {
    event.preventDefault();
    this.editPropertyError.set('');
    this.editPropertySuccess.set('');

    const request = this.buildPropertyRequest(
      destinationId,
      hotelName,
      address,
      pricePerNight,
      amenities,
      status,
      hotel.rating > 0 ? hotel.rating : null,
    );

    if (!request.destinationId || !request.hotelName || !request.address || !request.pricePerNight) {
      this.editPropertyError.set('Fill the required property details.');
      return;
    }

    this.savingEditProperty.set(true);
    this.hotelProvider
      .updateHotel(hotel.id, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          form.reset();
          this.editPropertyDialogState.set('closed');
          this.editingHotel.set(null);
          this.editPropertySuccess.set('Property updated in database.');
          this.hotelProvider.refreshProviderData();
        },
        error: (error: unknown) => {
          this.editPropertyError.set(error instanceof Error ? error.message : 'Could not update property.');
          this.savingEditProperty.set(false);
        },
        complete: () => {
          this.savingEditProperty.set(false);
        },
      });
  }

  private watchProperties(): void {
    combineLatest([
      this.hotelProvider.getProviderOverview().pipe(catchError(() => of(EMPTY_PROVIDER_OVERVIEW))),
      this.workspaceSearch.hotelQuery$,
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([overview, query]) => {
        this.hotels.set(filterHotelCards(mapHotelCards(overview.hotels, overview.rooms), query));
      });
  }

  private buildPropertyRequest(
    destinationId: string,
    hotelName: string,
    address: string,
    pricePerNight: string,
    amenities: string,
    status: string,
    rating: number | null,
  ): HotelRequest {
    return {
      destinationId: Number(destinationId),
      hotelName: hotelName.trim(),
      address: address.trim(),
      rating,
      pricePerNight: Number(pricePerNight),
      amenities: amenities.trim() || null,
      status,
    };
  }
}
