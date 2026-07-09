import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { WorkspaceSearchService } from '@app/shared/services/workspace-search.service';
import {
  EMPTY_PROVIDER_OVERVIEW,
  HotelProviderService,
  HotelResponse,
  RoomRequest,
} from '@app/features/hotel/services/hotel-provider.service';
import {
  RoomInventoryView,
  filterProviderOverview,
  groupRooms,
  roomOccupancy,
} from '@app/features/hotel/services/hotel-provider-view-models';
import { catchError, combineLatest, forkJoin, of } from 'rxjs';

export { roomOccupancy };

@Component({
  selector: 'app-manage-rooms',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    PageHeader,
  ],
  templateUrl: './manage-rooms.html',
})
export class ManageRooms {
  private readonly hotelProvider = inject(HotelProviderService);
  private readonly workspaceSearch = inject(WorkspaceSearchService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly rows = signal<RoomInventoryView[]>([]);
  public readonly hotels = signal<HotelResponse[]>([]);
  public readonly roomDialogState = signal<BrnDialogState>('closed');
  public readonly savingRoom = signal(false);
  public readonly roomError = signal('');
  public readonly roomSuccess = signal('');

  constructor() {
    this.watchRoomData();
  }

  public setRoomDialogState(state: BrnDialogState): void {
    this.roomDialogState.set(state);
    if (state === 'open') {
      this.roomError.set('');
      this.roomSuccess.set('');
    }
  }

  public createRoomType(
    event: SubmitEvent,
    form: HTMLFormElement,
    hotelId: string,
    roomType: string,
    capacity: string,
    bedType: string,
    pricePerNight: string,
    availabilityStatus: string,
    count: string,
  ): void {
    event.preventDefault();
    this.roomError.set('');
    this.roomSuccess.set('');

    const roomCount = Math.max(1, Math.floor(Number(count) || 1));
    const request: RoomRequest = {
      roomType: roomType.trim(),
      capacity: Number(capacity),
      bedType: bedType.trim(),
      pricePerNight: Number(pricePerNight),
      availabilityStatus,
    };

    if (!hotelId || !request.roomType || !request.capacity || !request.bedType || !request.pricePerNight) {
      this.roomError.set('Fill the required room type details.');
      return;
    }

    this.savingRoom.set(true);
    forkJoin(Array.from({ length: roomCount }, () => this.hotelProvider.createRoom(hotelId, request)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          form.reset();
          this.roomDialogState.set('closed');
          this.roomSuccess.set(`${roomCount} room${roomCount === 1 ? '' : 's'} saved to database.`);
          this.hotelProvider.refreshProviderData();
        },
        error: (error: unknown) => {
          this.roomError.set(error instanceof Error ? error.message : 'Could not save room type.');
          this.savingRoom.set(false);
        },
        complete: () => {
          this.savingRoom.set(false);
        },
      });
  }

  private watchRoomData(): void {
    combineLatest([
      this.hotelProvider.getProviderOverview().pipe(catchError(() => of(EMPTY_PROVIDER_OVERVIEW))),
      this.workspaceSearch.hotelQuery$,
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([overview, query]) => {
        const filteredOverview = filterProviderOverview(overview, query);
        this.hotels.set(filteredOverview.hotels);
        this.rows.set(groupRooms(filteredOverview.rooms));
      });
  }
}
