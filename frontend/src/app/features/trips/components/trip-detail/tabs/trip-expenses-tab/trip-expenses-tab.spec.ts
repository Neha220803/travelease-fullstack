import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideWallet } from '@ng-icons/lucide';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TripExpensesTab } from '@app/features/trips/components/trip-detail/tabs/trip-expenses-tab/trip-expenses-tab';

const TRIP_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('TripExpensesTab', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripExpensesTab],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcons({ lucidePlus, lucideWallet }),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ tripId: TRIP_ID })),
          },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  function flushPendingRequests() {
    // Flush expenses
    const expensesReq = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/expenses?page=0&size=10`,
    );
    expensesReq.flush({
      success: true,
      data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true },
      message: 'ok',
      error: null,
    });

    // Flush members
    const membersReq = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/members`,
    );
    membersReq.flush({ success: true, data: [], message: 'ok', error: null });

    // Flush settlement summary
    const settlementsReq = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/settlements/summary`,
    );
    settlementsReq.flush({
      success: true,
      data: { tripId: TRIP_ID, totalPayable: 0, totalReceivable: 0, settlements: [] },
      message: 'ok',
      error: null,
    });
  }

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TripExpensesTab);
    fixture.detectChanges();
    flushPendingRequests();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows empty state when no expenses exist', () => {
    const fixture = TestBed.createComponent(TripExpensesTab);
    fixture.detectChanges();
    flushPendingRequests();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No expenses recorded yet.');
  });

  it('shows settlement amounts from the API', () => {
    const fixture = TestBed.createComponent(TripExpensesTab);
    fixture.detectChanges();

    // Flush expenses
    httpMock
      .expectOne(`http://localhost:8080/api/trips/${TRIP_ID}/expenses?page=0&size=10`)
      .flush({
        success: true,
        data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true },
        message: 'ok',
        error: null,
      });

    // Flush members
    httpMock
      .expectOne(`http://localhost:8080/api/trips/${TRIP_ID}/members`)
      .flush({ success: true, data: [], message: 'ok', error: null });

    // Flush settlement summary with values
    httpMock
      .expectOne(`http://localhost:8080/api/trips/${TRIP_ID}/settlements/summary`)
      .flush({
        success: true,
        data: { tripId: TRIP_ID, totalPayable: 2500, totalReceivable: 3000, settlements: [] },
        message: 'ok',
        error: null,
      });

    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('2,500');
    expect(text).toContain('3,000');
  });
});
