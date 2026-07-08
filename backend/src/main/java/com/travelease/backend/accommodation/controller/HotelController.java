package com.travelease.backend.accommodation.controller;

import com.travelease.backend.accommodation.dto.HotelDetailsResponse;
import com.travelease.backend.accommodation.dto.HotelResponse;
import com.travelease.backend.accommodation.dto.HotelReviewResponse;
import com.travelease.backend.accommodation.dto.ReviewRequest;
import com.travelease.backend.accommodation.service.AccommodationService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hotels")
@RequiredArgsConstructor
@Tag(name = "Hotel Catalog & Reviews", description = "Traveler-facing Hotel search/details and reviews. Not "
        + "in SecurityConfig's permitAll list, so every endpoint here requires a valid JWT (any of the five "
        + "roles) even though none carries a role-specific @PreAuthorize.")
public class HotelController {

    private final AccommodationService accommodationService;

    @GetMapping
    @Operation(summary = "Search Hotels", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Read-only catalog search across every Hotel Provider's hotels, not tenant-scoped.")
    public ResponseEntity<ApiResponse<List<HotelResponse>>> searchHotels(
            @RequestParam(required = false) Integer destinationId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, name = "q") String query
    ) {
        List<HotelResponse> response = accommodationService.searchHotels(destinationId, status, query);
        return ResponseEntity.ok(ApiResponse.success(response, "Hotels retrieved"));
    }

    @GetMapping("/{hotelId}")
    @Operation(summary = "Get Hotel details", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Read-only, not tenant-scoped.")
    public ResponseEntity<ApiResponse<HotelDetailsResponse>> getHotel(@PathVariable UUID hotelId) {
        HotelDetailsResponse response = accommodationService.getHotelDetails(hotelId);
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel details retrieved"));
    }

    @GetMapping("/{hotelId}/reviews")
    @Operation(summary = "List Hotel reviews", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Read-only, not owner-scoped - returns every Traveler's reviews for this hotel.")
    public ResponseEntity<ApiResponse<List<HotelReviewResponse>>> getReviews(@PathVariable UUID hotelId) {
        List<HotelReviewResponse> response = accommodationService.getReviews(hotelId);
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel reviews retrieved"));
    }

    @PostMapping("/{hotelId}/reviews")
    @Operation(summary = "Add a Hotel review", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "IDENTITY: The review's author is resolved from the authenticated JWT, not a client-supplied "
            + "field.")
    public ResponseEntity<ApiResponse<HotelReviewResponse>> addReview(
            @PathVariable UUID hotelId,
            @Valid @RequestBody ReviewRequest request,
            Authentication authentication
    ) {
        HotelReviewResponse response = accommodationService.addReview(hotelId, request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Hotel review added"));
    }

    @PutMapping("/{hotelId}/reviews/{reviewId}")
    @Operation(summary = "Update my Hotel review", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Original review author only - no ADMIN bypass on this ownership check. Another "
            + "Traveler's review id returns 403.")
    public ResponseEntity<ApiResponse<HotelReviewResponse>> updateReview(
            @PathVariable UUID hotelId,
            @PathVariable UUID reviewId,
            @Valid @RequestBody ReviewRequest request,
            Authentication authentication
    ) {
        HotelReviewResponse response = accommodationService.updateReview(
                hotelId,
                reviewId,
                request,
                authentication.getName()
        );
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel review updated"));
    }

    @DeleteMapping("/{hotelId}/reviews/{reviewId}")
    @Operation(summary = "Delete my Hotel review", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Original review author only, same as update above - no ADMIN bypass.")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable UUID hotelId,
            @PathVariable UUID reviewId,
            Authentication authentication
    ) {
        accommodationService.deleteReview(hotelId, reviewId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Hotel review deleted"));
    }
}
