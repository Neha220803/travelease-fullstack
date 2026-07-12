package com.travelease.backend.itinerary.service;

import com.travelease.backend.itinerary.entity.Itinerary;
import com.travelease.backend.itinerary.repository.ItineraryRepository;
import com.travelease.backend.trip.repository.TripRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * createFromPaidBooking is the hook AccommodationServiceImpl.createBooking and
 * BookingServiceImpl.confirmBookingInternal call at the moment a booking's
 * (simulated) payment succeeds, so a trip's itinerary reflects what was
 * actually paid for instead of requiring the traveler to duplicate it by hand.
 */
@ExtendWith(MockitoExtension.class)
class ItineraryServiceCreateFromPaidBookingTest {

    @Mock
    private ItineraryRepository itineraryRepository;
    @Mock
    private TripRepository tripRepository;

    @InjectMocks
    private ItineraryService itineraryService;

    @Test
    void createsAPendingItineraryEntryWhenTheTripExists() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        itineraryService.createFromPaidBooking(tripId, "Stay at Grand Palace Mumbai", LocalDate.of(2026, 8, 1));

        ArgumentCaptor<Itinerary> captor = ArgumentCaptor.forClass(Itinerary.class);
        verify(itineraryRepository).save(captor.capture());
        Itinerary saved = captor.getValue();
        assertThat(saved.getTripId()).isEqualTo(tripId.toString());
        assertThat(saved.getActivityName()).isEqualTo("Stay at Grand Palace Mumbai");
        assertThat(saved.getActivityDate()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(saved.getStatus()).isEqualTo("Pending");
        assertThat(saved.getItineraryId()).isNotBlank();
        assertThat(saved.getActivityId()).isNotBlank();
    }

    @Test
    void doesNothingWhenTheBookingIsNotAttachedToATrip() {
        itineraryService.createFromPaidBooking(null, "Stay at Grand Palace Mumbai", LocalDate.now());

        verifyNoInteractions(itineraryRepository);
    }

    @Test
    void doesNothingWhenTheAttachedTripNoLongerExists() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(false);

        itineraryService.createFromPaidBooking(tripId, "Stay at Grand Palace Mumbai", LocalDate.now());

        verify(itineraryRepository, never()).save(any());
    }
}
