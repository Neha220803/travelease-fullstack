import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { Activity } from '@app/core/activities/activity.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(ActivitiesService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('ActivitiesService', () => {
  it('fetches activities for a destination (raw array, no envelope)', async () => {
    const { service, httpMock } = await setup();
    const activities: Activity[] = [
      {
        activityId: 'a1',
        destinationId: 2,
        activityName: 'Scuba Diving',
        durationHours: 3,
        startTime: '09:00',
        endTime: '12:00',
        description: 'Guided scuba session',
      },
    ];

    let result: Activity[] | undefined;
    service.getActivities(2).subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/api/activities' && r.params.get('destinationId') === '2',
    );
    expect(req.request.method).toBe('GET');
    req.flush(activities);

    expect(result).toEqual(activities);
  });

  it('propagates an HTTP error', async () => {
    const { service, httpMock } = await setup();

    let errored = false;
    service.getActivities(2).subscribe({ error: () => (errored = true) });

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/activities');
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(errored).toBe(true);
  });
});
