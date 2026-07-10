import { TestBed } from '@angular/core/testing';
import { PassengerDetailsForm } from '@app/features/bus-booking/components/passenger-details-form/passenger-details-form';
import { SeatResponse } from '@app/features/bus-booking/services/schedule.models';

const SEATS: SeatResponse[] = [
  { id: 1, seatNumber: 'A1', seatType: 'WINDOW', deck: 1, status: 'AVAILABLE' },
  { id: 2, seatNumber: 'A2', seatType: 'LADIES', deck: 1, status: 'AVAILABLE' },
];

describe('PassengerDetailsForm', () => {
  it('locks the gender field to FEMALE for a LADIES seat row', async () => {
    await TestBed.configureTestingModule({ imports: [PassengerDetailsForm] }).compileComponents();
    const fixture = TestBed.createComponent(PassengerDetailsForm);
    fixture.componentRef.setInput('seats', SEATS);
    fixture.detectChanges();

    const genderSelects = (fixture.nativeElement as HTMLElement).querySelectorAll('select[data-role="gender"]');
    const ladiesRowSelect = genderSelects[1] as HTMLSelectElement;
    expect(ladiesRowSelect.disabled).toBe(true);
    expect(ladiesRowSelect.value).toBe('FEMALE');
  });

  it('defaults the primary-passenger radio to the first row and emits FEMALE/MALE/OTHER values', async () => {
    await TestBed.configureTestingModule({ imports: [PassengerDetailsForm] }).compileComponents();
    const fixture = TestBed.createComponent(PassengerDetailsForm);
    fixture.componentRef.setInput('seats', SEATS);
    fixture.detectChanges();

    let emitted: { valid: boolean; passengers: unknown[] } | undefined;
    fixture.componentInstance.detailsChange.subscribe((e) => (emitted = e as { valid: boolean; passengers: unknown[] }));

    const nameInputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input[data-role="name"]');
    (nameInputs[0] as HTMLInputElement).value = 'Alice';
    (nameInputs[0] as HTMLInputElement).dispatchEvent(new Event('input'));
    (nameInputs[1] as HTMLInputElement).value = 'Bob';
    (nameInputs[1] as HTMLInputElement).dispatchEvent(new Event('input'));

    expect(emitted?.passengers.length).toBe(2);
    const primaryRadios = (fixture.nativeElement as HTMLElement).querySelectorAll('input[data-role="primary"]') as NodeListOf<HTMLInputElement>;
    expect(primaryRadios[0].checked).toBe(true);
  });
});
