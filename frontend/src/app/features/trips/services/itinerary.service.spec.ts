import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import {
  CreateItineraryPayload,
  ItineraryItem,
  ItineraryProgress,
} from '@app/features/trips/services/itinerary.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(ItineraryService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

const SAMPLE_ITEM: ItineraryItem = {
  itineraryId: 'i1',
  tripId: 't1',
  activityId: 'a1',
  activityName: 'Scuba Diving',
  activityDate: '2026-07-13',
  startTime: null,
  endTime: null,
  status: 'Pending',
  completionTime: null,
};

describe('ItineraryService', () => {
  it('lists itinerary items for a trip (raw array, no envelope)', async () => {
    const { service, httpMock } = await setup();

    let result: ItineraryItem[] | undefined;
    service.list('t1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/api/itinerary' && r.params.get('tripId') === 't1',
    );
    expect(req.request.method).toBe('GET');
    req.flush([SAMPLE_ITEM]);

    expect(result).toEqual([SAMPLE_ITEM]);
  });

  it('creates an itinerary item', async () => {
    const { service, httpMock } = await setup();
    const payload: CreateItineraryPayload = {
      tripId: 't1',
      activityId: 'a1',
      activityDate: '2026-07-13',
      status: 'Pending',
    };

    let result: ItineraryItem | undefined;
    service.create(payload).subscribe((r) => (result = r));

    const req = httpMock.expectOne('http://localhost:8080/api/itinerary');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(SAMPLE_ITEM);

    expect(result).toEqual(SAMPLE_ITEM);
  });

  it('fetches itinerary progress for a trip', async () => {
    const { service, httpMock } = await setup();
    const progress: ItineraryProgress = {
      tripId: 't1',
      totalActivities: 4,
      completedActivities: 4,
      pendingActivities: 0,
      completionPercentage: 100,
    };

    let result: ItineraryProgress | undefined;
    service.getProgress('t1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/api/itinerary/progress' && r.params.get('tripId') === 't1',
    );
    expect(req.request.method).toBe('GET');
    req.flush(progress);

    expect(result).toEqual(progress);
  });
});
