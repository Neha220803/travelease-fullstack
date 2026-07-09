import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { Recommendation } from '@app/core/recommendations/recommendation.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(RecommendationsService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('RecommendationsService', () => {
  it('fetches recommendations for a category (raw array, no envelope)', async () => {
    const { service, httpMock } = await setup();
    const recommendations: Recommendation[] = [
      { recommendationId: 'r1', categoryId: 4, recommendationType: 'Activity', referenceId: 'a1', rankOrder: 1 },
    ];

    let result: Recommendation[] | undefined;
    service.getRecommendations(4).subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/api/recommendations' && r.params.get('categoryId') === '4',
    );
    expect(req.request.method).toBe('GET');
    req.flush(recommendations);

    expect(result).toEqual(recommendations);
  });

  it('propagates an HTTP error', async () => {
    const { service, httpMock } = await setup();

    let errored = false;
    service.getRecommendations(4).subscribe({ error: () => (errored = true) });

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/recommendations');
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(errored).toBe(true);
  });
});
