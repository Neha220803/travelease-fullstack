import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TravelerPicker } from '@app/features/trips/components/traveler-picker/traveler-picker';
import { UsersService } from '@app/core/users/users.service';
import { TravelerSearchResult } from '@app/core/users/user-search.model';

const CARA: TravelerSearchResult = { id: 'u3', name: 'Cara Traveler', email: 'cara@travelease.test' };
const BOB: TravelerSearchResult = { id: 'u2', name: 'Bob Traveler', email: 'bob@travelease.test' };

async function setup(searchTravelers: (query: string) => ReturnType<UsersService['searchTravelers']>) {
  await TestBed.configureTestingModule({
    imports: [TravelerPicker],
    providers: [{ provide: UsersService, useValue: { searchTravelers } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(TravelerPicker);
  fixture.componentRef.setInput('inputId', 'test-picker');
  fixture.detectChanges();
  return fixture;
}

function instance(fixture: ReturnType<typeof TestBed.createComponent<TravelerPicker>>) {
  return fixture.componentInstance as unknown as {
    query: { set: (v: string) => void };
    results: () => TravelerSearchResult[];
    searching: () => boolean;
    onValueChange: (v: TravelerSearchResult | null | undefined) => void;
  };
}

describe('TravelerPicker', () => {
  it('does not search below the minimum query length', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([CARA]));
    const fixture = await setup(searchTravelers);
    instance(fixture).query.set('c');
    await new Promise((r) => setTimeout(r, 350));

    expect(searchTravelers).not.toHaveBeenCalled();
  });

  it('debounces and calls the service once the query is long enough', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([CARA]));
    const fixture = await setup(searchTravelers);
    instance(fixture).query.set('cara');
    await new Promise((r) => setTimeout(r, 350));
    fixture.detectChanges();

    expect(searchTravelers).toHaveBeenCalledWith('cara');
    expect(instance(fixture).results()).toEqual([CARA]);
  });

  it('filters out excluded ids from the results', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([CARA, BOB]));
    const fixture = await setup(searchTravelers);
    fixture.componentRef.setInput('excludeIds', ['u2']);
    instance(fixture).query.set('trav');
    await new Promise((r) => setTimeout(r, 350));
    fixture.detectChanges();

    expect(instance(fixture).results()).toEqual([CARA]);
  });

  it('emits selected on pick and clears its own state', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([CARA]));
    const fixture = await setup(searchTravelers);
    const emitted: TravelerSearchResult[] = [];
    fixture.componentInstance.selected.subscribe((t) => emitted.push(t));

    instance(fixture).query.set('cara');
    await new Promise((r) => setTimeout(r, 350));
    fixture.detectChanges();
    instance(fixture).onValueChange(CARA);

    expect(emitted).toEqual([CARA]);
    expect(instance(fixture).results()).toEqual([]);
  });

  it('ignores a null/undefined value change (no-op close)', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([]));
    const fixture = await setup(searchTravelers);
    const emitted: TravelerSearchResult[] = [];
    fixture.componentInstance.selected.subscribe((t) => emitted.push(t));

    instance(fixture).onValueChange(null);

    expect(emitted).toEqual([]);
  });
});
