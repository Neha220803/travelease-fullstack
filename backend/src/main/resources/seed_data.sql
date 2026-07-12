-- ============================================================
-- TravelEase – Bus Booking Management System
-- Comprehensive Seed Data for H2 Database
-- Run after application startup (tables auto-created by Hibernate)
-- ============================================================

-- ============================================================
-- 1. BUSES (provider_id = 1 for all)
-- Entity columns: id, bus_number, bus_name, total_seats, bus_type,
--   provider_id, status, created_at
-- NOTE: amenities stored in separate bus_amenities table (@ElementCollection)
-- ============================================================
INSERT INTO buses (bus_number, bus_name, total_seats, bus_type, provider_id, status, created_at) VALUES
('KA01AB1234', 'Sharma Travels Express', 40, 'AC_SEATER', 1, 'ACTIVE', '2026-01-01 10:00:00'),
('KA02BC5678', 'Sharma Travels Sleeper', 30, 'AC_SLEEPER', 1, 'ACTIVE', '2026-01-02 10:00:00'),
('MH03CD9012', 'Sharma Travels Semi-Sleeper', 36, 'AC_SEMI_SLEEPER', 1, 'ACTIVE', '2026-01-03 10:00:00'),
('MH04DE3456', 'Sharma Travels Non-AC', 44, 'NON_AC_SEATER', 1, 'ACTIVE', '2026-01-04 10:00:00'),
('TN05EF7890', 'Sharma Travels Volvo', 38, 'AC_LUXURY', 1, 'ACTIVE', '2026-01-05 10:00:00'),
('TN06GH2345', 'Sharma Travels Mini', 24, 'AC_SEATER', 1, 'MAINTENANCE', '2026-01-06 10:00:00');

-- ============================================================
-- 1b. BUS AMENITIES (@ElementCollection join table)
-- ============================================================
INSERT INTO bus_amenities (bus_id, amenity) VALUES
(1, 'WiFi'), (1, 'AC'), (1, 'USB Charging'), (1, 'Water Bottle'),
(2, 'WiFi'), (2, 'AC'), (2, 'Blanket'), (2, 'Pillow'), (2, 'Water Bottle'),
(3, 'AC'), (3, 'USB Charging'), (3, 'Water Bottle'),
(4, 'USB Charging'), (4, 'Water Bottle'),
(5, 'WiFi'), (5, 'AC'), (5, 'USB Charging'), (5, 'Water Bottle'), (5, 'Blanket'), (5, 'Entertainment'),
(6, 'AC'), (6, 'USB Charging');

-- ============================================================
-- 2. ROUTES
-- Entity columns: id, source, destination, distance_km,
--   duration_hours, status, created_at
-- ============================================================
INSERT INTO routes (source, destination, distance_km, duration_hours, status, created_at) VALUES
('Bangalore', 'Chennai', 350.5, 6.5, 'ACTIVE', '2026-01-01 10:00:00'),
('Bangalore', 'Hyderabad', 570.0, 9.0, 'ACTIVE', '2026-01-01 10:00:00'),
('Bangalore', 'Mumbai', 980.0, 16.0, 'ACTIVE', '2026-01-01 10:00:00'),
('Chennai', 'Hyderabad', 630.0, 10.0, 'ACTIVE', '2026-01-01 10:00:00'),
('Mumbai', 'Pune', 150.0, 3.0, 'ACTIVE', '2026-01-01 10:00:00'),
('Bangalore', 'Coimbatore', 420.0, 7.5, 'ACTIVE', '2026-01-01 10:00:00'),
('Pune', 'Goa', 450.0, 10.0, 'ACTIVE', '2026-01-01 10:00:00'),
('Mumbai', 'Goa', 600.0, 12.0, 'ACTIVE', '2026-01-01 10:00:00'),
('Delhi', 'Manali', 550.0, 14.0, 'ACTIVE', '2026-01-01 10:00:00');

-- ============================================================
-- 3. SCHEDULES (bus + route + date)
-- Entity columns: id, bus_id, route_id, travel_date, departure_time,
--   arrival_time, fare, available_seats, status, created_at, version
-- ============================================================
INSERT INTO bus_schedules (bus_id, route_id, travel_date, departure_time, arrival_time, fare, available_seats, status, created_at, version) VALUES
(1, 1, '2026-07-15', '22:00:00', '05:00:00', 850.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(2, 1, '2026-07-15', '21:00:00', '04:00:00', 1200.00, 30, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(3, 2, '2026-07-16', '20:00:00', '05:00:00', 1100.00, 36, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(4, 4, '2026-07-16', '18:00:00', '04:00:00', 750.00, 44, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(5, 3, '2026-07-17', '19:00:00', '11:00:00', 1800.00, 38, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(1, 5, '2026-07-18', '06:00:00', '09:00:00', 450.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(2, 6, '2026-07-18', '21:30:00', '05:00:00', 950.00, 30, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(1, 7, '2026-07-20', '22:00:00', '08:00:00', 1200.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(2, 7, '2026-07-25', '21:30:00', '07:30:00', 1500.00, 30, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(3, 8, '2026-08-01', '19:00:00', '07:00:00', 1800.00, 36, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(4, 9, '2026-08-05', '18:00:00', '08:00:00', 1600.00, 44, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(1, 8, '2026-07-13', '19:30:00', '07:30:00', 1500.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(2, 8, '2026-07-15', '20:00:00', '08:00:00', 1600.00, 30, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(3, 8, '2026-07-17', '19:30:00', '07:30:00', 1500.00, 36, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(4, 8, '2026-07-19', '20:30:00', '08:30:00', 1400.00, 44, 'SCHEDULED', '2026-01-10 10:00:00', 0);

-- ============================================================
-- 4. SEATS (for each bus)
-- Entity columns: id, bus_id, seat_number, seat_type, deck,
--   status, version
-- ============================================================
-- Bus 1: 40 seats (AC_SEATER)
INSERT INTO seats (bus_id, seat_number, seat_type, deck, status, version) VALUES
(1, 'A1', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'A2', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'A3', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'A4', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'A5', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'A6', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'A7', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'A8', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'A9', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'A10', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'B1', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'B2', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'B3', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'B4', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'B5', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'B6', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'B7', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'B8', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'B9', 'WINDOW', 1, 'AVAILABLE', 0), (1, 'B10', 'AISLE', 1, 'AVAILABLE', 0),
(1, 'C1', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'C2', 'AISLE', 2, 'AVAILABLE', 0),
(1, 'C3', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'C4', 'AISLE', 2, 'AVAILABLE', 0),
(1, 'C5', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'C6', 'AISLE', 2, 'AVAILABLE', 0),
(1, 'C7', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'C8', 'AISLE', 2, 'AVAILABLE', 0),
(1, 'C9', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'C10', 'AISLE', 2, 'AVAILABLE', 0),
(1, 'D1', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'D2', 'AISLE', 2, 'AVAILABLE', 0),
(1, 'D3', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'D4', 'AISLE', 2, 'AVAILABLE', 0),
(1, 'D5', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'D6', 'AISLE', 2, 'AVAILABLE', 0),
(1, 'D7', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'D8', 'AISLE', 2, 'AVAILABLE', 0),
(1, 'D9', 'WINDOW', 2, 'AVAILABLE', 0), (1, 'D10', 'AISLE', 2, 'AVAILABLE', 0);

-- Bus 2: 30 seats (AC_SLEEPER)
INSERT INTO seats (bus_id, seat_number, seat_type, deck, status, version) VALUES
(2, 'S1', 'WINDOW', 1, 'AVAILABLE', 0), (2, 'S2', 'AISLE', 1, 'AVAILABLE', 0),
(2, 'S3', 'WINDOW', 1, 'AVAILABLE', 0), (2, 'S4', 'AISLE', 1, 'AVAILABLE', 0),
(2, 'S5', 'WINDOW', 1, 'AVAILABLE', 0), (2, 'S6', 'AISLE', 1, 'AVAILABLE', 0),
(2, 'S7', 'WINDOW', 1, 'AVAILABLE', 0), (2, 'S8', 'AISLE', 1, 'AVAILABLE', 0),
(2, 'S9', 'WINDOW', 1, 'AVAILABLE', 0), (2, 'S10', 'AISLE', 1, 'AVAILABLE', 0),
(2, 'S11', 'WINDOW', 1, 'AVAILABLE', 0), (2, 'S12', 'AISLE', 1, 'AVAILABLE', 0),
(2, 'S13', 'WINDOW', 1, 'AVAILABLE', 0), (2, 'S14', 'AISLE', 1, 'AVAILABLE', 0),
(2, 'S15', 'WINDOW', 1, 'AVAILABLE', 0),
(2, 'U1', 'WINDOW', 2, 'AVAILABLE', 0), (2, 'U2', 'AISLE', 2, 'AVAILABLE', 0),
(2, 'U3', 'WINDOW', 2, 'AVAILABLE', 0), (2, 'U4', 'AISLE', 2, 'AVAILABLE', 0),
(2, 'U5', 'WINDOW', 2, 'AVAILABLE', 0), (2, 'U6', 'AISLE', 2, 'AVAILABLE', 0),
(2, 'U7', 'WINDOW', 2, 'AVAILABLE', 0), (2, 'U8', 'AISLE', 2, 'AVAILABLE', 0),
(2, 'U9', 'WINDOW', 2, 'AVAILABLE', 0), (2, 'U10', 'AISLE', 2, 'AVAILABLE', 0),
(2, 'U11', 'WINDOW', 2, 'AVAILABLE', 0), (2, 'U12', 'AISLE', 2, 'AVAILABLE', 0),
(2, 'U13', 'WINDOW', 2, 'AVAILABLE', 0), (2, 'U14', 'AISLE', 2, 'AVAILABLE', 0),
(2, 'U15', 'WINDOW', 2, 'AVAILABLE', 0);

-- Bus 3: 12 seats (AC_SEMI_SLEEPER) – representative sample
INSERT INTO seats (bus_id, seat_number, seat_type, deck, status, version) VALUES
(3, 'SS1', 'WINDOW', 1, 'AVAILABLE', 0), (3, 'SS2', 'AISLE', 1, 'AVAILABLE', 0),
(3, 'SS3', 'WINDOW', 1, 'AVAILABLE', 0), (3, 'SS4', 'AISLE', 1, 'AVAILABLE', 0),
(3, 'SS5', 'WINDOW', 1, 'AVAILABLE', 0), (3, 'SS6', 'AISLE', 1, 'AVAILABLE', 0),
(3, 'SS7', 'WINDOW', 2, 'AVAILABLE', 0), (3, 'SS8', 'AISLE', 2, 'AVAILABLE', 0),
(3, 'SS9', 'WINDOW', 2, 'AVAILABLE', 0), (3, 'SS10', 'AISLE', 2, 'AVAILABLE', 0),
(3, 'SS11', 'WINDOW', 2, 'AVAILABLE', 0), (3, 'SS12', 'AISLE', 2, 'AVAILABLE', 0);

-- Bus 4: 12 seats (NON_AC_SEATER) – representative sample
INSERT INTO seats (bus_id, seat_number, seat_type, deck, status, version) VALUES
(4, 'N1', 'WINDOW', 1, 'AVAILABLE', 0), (4, 'N2', 'AISLE', 1, 'AVAILABLE', 0),
(4, 'N3', 'WINDOW', 1, 'AVAILABLE', 0), (4, 'N4', 'AISLE', 1, 'AVAILABLE', 0),
(4, 'N5', 'WINDOW', 1, 'AVAILABLE', 0), (4, 'N6', 'AISLE', 1, 'AVAILABLE', 0),
(4, 'N7', 'WINDOW', 2, 'AVAILABLE', 0), (4, 'N8', 'AISLE', 2, 'AVAILABLE', 0),
(4, 'N9', 'WINDOW', 2, 'AVAILABLE', 0), (4, 'N10', 'AISLE', 2, 'AVAILABLE', 0),
(4, 'N11', 'WINDOW', 2, 'AVAILABLE', 0), (4, 'N12', 'AISLE', 2, 'AVAILABLE', 0);

-- Bus 5: 12 seats (AC_LUXURY) – representative sample
INSERT INTO seats (bus_id, seat_number, seat_type, deck, status, version) VALUES
(5, 'L1', 'WINDOW', 1, 'AVAILABLE', 0), (5, 'L2', 'AISLE', 1, 'AVAILABLE', 0),
(5, 'L3', 'WINDOW', 1, 'AVAILABLE', 0), (5, 'L4', 'AISLE', 1, 'AVAILABLE', 0),
(5, 'L5', 'WINDOW', 1, 'AVAILABLE', 0), (5, 'L6', 'AISLE', 1, 'AVAILABLE', 0),
(5, 'L7', 'WINDOW', 2, 'AVAILABLE', 0), (5, 'L8', 'AISLE', 2, 'AVAILABLE', 0),
(5, 'L9', 'WINDOW', 2, 'AVAILABLE', 0), (5, 'L10', 'AISLE', 2, 'AVAILABLE', 0),
(5, 'L11', 'WINDOW', 2, 'AVAILABLE', 0), (5, 'L12', 'AISLE', 2, 'AVAILABLE', 0);

-- Bus 6: 10 seats (AC_SEATER – maintenance)
INSERT INTO seats (bus_id, seat_number, seat_type, deck, status, version) VALUES
(6, 'M1', 'WINDOW', 1, 'MAINTENANCE', 0), (6, 'M2', 'AISLE', 1, 'MAINTENANCE', 0),
(6, 'M3', 'WINDOW', 1, 'MAINTENANCE', 0), (6, 'M4', 'AISLE', 1, 'MAINTENANCE', 0),
(6, 'M5', 'WINDOW', 1, 'MAINTENANCE', 0), (6, 'M6', 'AISLE', 1, 'MAINTENANCE', 0),
(6, 'M7', 'WINDOW', 2, 'MAINTENANCE', 0), (6, 'M8', 'AISLE', 2, 'MAINTENANCE', 0),
(6, 'M9', 'WINDOW', 2, 'MAINTENANCE', 0), (6, 'M10', 'AISLE', 2, 'MAINTENANCE', 0);

-- ============================================================
-- 5. DRIVERS
-- Entity columns: id, provider_id, name, license_number, phone,
--   email, status, total_trips, total_distance_km, rating,
--   active, created_at, updated_at
-- ============================================================
INSERT INTO drivers (provider_id, name, license_number, phone, email, status, total_trips, total_distance_km, rating, active, created_at, updated_at) VALUES
(1, 'Rajesh Kumar', 'DL-KA-2024-001', '9876543210', 'rajesh@example.com', 'AVAILABLE', 150, 45000.0, 4.8, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(1, 'Suresh Reddy', 'DL-KA-2024-002', '9876543211', 'suresh@example.com', 'ON_TRIP', 200, 60000.0, 4.6, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(1, 'Manoj Singh', 'DL-MH-2024-003', '9876543212', 'manoj@example.com', 'OFF_DUTY', 80, 24000.0, 4.5, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(1, 'Vikram Patel', 'DL-TN-2024-004', '9876543213', 'vikram@example.com', 'AVAILABLE', 120, 36000.0, 4.7, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

-- ============================================================
-- 6. CONDUCTORS
-- Entity columns: id, provider_id, name, employee_id, phone,
--   email, status, total_trips, rating, active, created_at, updated_at
-- ============================================================
INSERT INTO conductors (provider_id, name, employee_id, phone, email, status, total_trips, rating, active, created_at, updated_at) VALUES
(1, 'Amit Sharma', 'EMP-CON-001', '9876543220', 'amit@example.com', 'AVAILABLE', 100, 4.5, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(1, 'Ravi Verma', 'EMP-CON-002', '9876543221', 'ravi@example.com', 'ON_TRIP', 180, 4.3, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(1, 'Deepak Joshi', 'EMP-CON-003', '9876543222', 'deepak@example.com', 'OFF_DUTY', 60, 4.6, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

-- ============================================================
-- 7. MAINTENANCE RECORDS
-- Entity table: maintenance_records
-- Entity columns: id, bus_id, maintenance_type, description,
--   status, scheduled_date, completed_date, cost,
--   next_maintenance_date, performed_by, created_at
-- ============================================================
INSERT INTO maintenance_records (bus_id, maintenance_type, description, status, scheduled_date, completed_date, cost, next_maintenance_date, performed_by, created_at) VALUES
(1, 'OIL_CHANGE', 'Regular oil change service', 'COMPLETED', '2026-06-01', '2026-06-01', 3500.0, '2026-09-01', 'ABC Service Center', '2026-06-01 08:00:00'),
(1, 'TIRE_ROTATION', 'Tire rotation and alignment', 'COMPLETED', '2026-06-15', '2026-06-15', 5000.0, '2026-12-15', 'ABC Service Center', '2026-06-15 08:00:00'),
(2, 'ENGINE_REPAIR', 'Engine overhaul', 'IN_PROGRESS', '2026-06-20', NULL, 25000.0, '2027-06-20', 'XYZ Motors', '2026-06-20 08:00:00'),
(3, 'AC_SERVICE', 'AC compressor repair', 'SCHEDULED', '2026-07-10', NULL, 8000.0, '2026-10-10', 'CoolAir Services', '2026-07-01 08:00:00'),
(6, 'BRAKE_INSPECTION', 'Brake pad replacement', 'SCHEDULED', '2026-07-05', NULL, 12000.0, '2026-10-05', 'ABC Service Center', '2026-07-01 08:00:00');

-- ============================================================
-- 8. TRIPS
-- Entity columns: id, schedule_id, driver_id, conductor_id,
--   status, actual_departure_time, actual_arrival_time,
--   delay_minutes, distance_covered_km, notes, created_at, updated_at
--
-- TARGET-SCHEMA COMPATIBILITY ADAPTATION (not present in the standalone source file):
-- the integrated project's BusBooking Trip entity maps to table "bus_trips", not
-- "trips" - "trips" is a DIFFERENT table already owned by the unrelated trip-expense-
-- splitting module's Trip entity (com.travelease.backend.trip.entity.Trip), which has
-- an entirely different column set (trip_name, organizer_id, budget_amount, etc.).
-- Inserting this BusBooking column set into "trips" fails with a column-not-found
-- error, silently swallowed by spring.sql.init.continue-on-error=true.
-- ============================================================
INSERT INTO bus_trips (schedule_id, driver_id, conductor_id, status, actual_departure_time, actual_arrival_time, delay_minutes, distance_covered_km, notes, created_at, updated_at) VALUES
(1, 1, 1, 'COMPLETED', '2026-07-14 22:05:00', '2026-07-15 05:10:00', 10, 350.5, 'On-time arrival', '2026-07-14 20:00:00', '2026-07-15 05:10:00'),
(2, 2, 2, 'RUNNING', '2026-07-15 21:00:00', NULL, 0, 200.0, 'Currently en route', '2026-07-15 19:00:00', '2026-07-15 21:00:00'),
(3, 3, 3, 'SCHEDULED', NULL, NULL, 0, 0.0, 'Upcoming trip', '2026-07-15 18:00:00', '2026-07-15 18:00:00'),
(4, 4, 1, 'DELAYED', '2026-07-16 18:45:00', NULL, 45, 300.0, 'Heavy traffic', '2026-07-16 16:00:00', '2026-07-16 18:45:00');

-- ============================================================
-- 9. COUPONS
-- Entity columns: id, code, description, discount_type,
--   discount_value, min_fare, max_discount, valid_from (DATE),
--   valid_to (DATE), max_usage, used_count, applicable_bus_types,
--   applicable_route_ids, active, created_at
-- ============================================================
INSERT INTO coupons (code, description, discount_type, discount_value, min_fare, max_discount, valid_from, valid_to, max_usage, used_count, applicable_bus_types, applicable_route_ids, active, created_at) VALUES
('FIRST100', '10% off for first 100 bookings', 'PERCENTAGE', 10.0, 500.0, 200.0, '2026-01-01', '2026-12-31', 100, 15, NULL, NULL, 1, '2026-01-01 10:00:00'),
('FLAT200', 'Flat 200 off on bookings above 1000', 'FIXED', 200.0, 1000.0, 200.0, '2026-01-01', '2026-06-30', 50, 8, NULL, NULL, 1, '2026-01-01 10:00:00'),
('SUMMER25', '25% off summer sale', 'PERCENTAGE', 25.0, 800.0, 500.0, '2026-06-01', '2026-08-31', 200, 42, NULL, NULL, 1, '2026-06-01 10:00:00'),
('WEEKEND50', 'Weekend special 50 off', 'FIXED', 50.0, 400.0, 50.0, '2026-01-01', '2026-12-31', 500, 120, NULL, NULL, 1, '2026-01-01 10:00:00');

-- ============================================================
-- 10. FARE RULES
-- Entity columns: id, route_id, bus_type, base_fare,
--   dynamic_fare_enabled, occupancy_threshold_1/2/3,
--   fare_multiplier_1/2/3, weekend_surcharge_percent,
--   festival_surcharge_percent, festival_start_date, festival_end_date,
--   seasonal_surcharge_percent, seasonal_start_date, seasonal_end_date,
--   sleeper_surcharge_percent, semi_sleeper_surcharge_percent,
--   luxury_surcharge_percent, gst_percent, tax_percent,
--   cancellation_charge_percent, refund_percent, active,
--   created_at, updated_at
-- ============================================================
INSERT INTO fare_rules (route_id, bus_type, base_fare, gst_percent, cancellation_charge_percent, refund_percent, active, created_at, updated_at) VALUES
(1, 'AC_SEATER', 750.0, 5.0, 10.0, 90.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(1, 'AC_SLEEPER', 1050.0, 5.0, 10.0, 90.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(2, 'AC_SEMI_SLEEPER', 950.0, 5.0, 10.0, 90.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(3, 'AC_LUXURY', 1600.0, 5.0, 10.0, 90.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(4, 'NON_AC_SEATER', 650.0, 5.0, 10.0, 90.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(5, 'AC_SEATER', 380.0, 5.0, 10.0, 90.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(6, 'AC_SLEEPER', 850.0, 5.0, 10.0, 90.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

-- ============================================================
-- 11. CANCELLATION POLICIES
-- Entity columns: id, route_id, bus_type, time_window_hours,
--   cancellation_charge_percent, refund_percent, active,
--   created_at, updated_at
-- ============================================================
INSERT INTO cancellation_policies (route_id, bus_type, time_window_hours, cancellation_charge_percent, refund_percent, active, created_at, updated_at) VALUES
(NULL, NULL, 24, 10.0, 90.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(NULL, 'AC_SLEEPER', 48, 15.0, 85.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(NULL, 'AC_LUXURY', 72, 20.0, 80.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(1, NULL, 12, 5.0, 95.0, 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

-- ============================================================
-- 12. DISCOUNTS
-- Entity columns: id, name, description, discount_type,
--   discount_value, applicable_route_ids, applicable_bus_types,
--   valid_from (DATE), valid_to (DATE), active, created_at
-- ============================================================
INSERT INTO discounts (name, description, discount_type, discount_value, applicable_route_ids, applicable_bus_types, valid_from, valid_to, active, created_at) VALUES
('New Year Sale', '5% off on all routes', 'PERCENTAGE', 5.0, NULL, NULL, '2026-01-01', '2026-01-31', 1, '2026-01-01 10:00:00'),
('Monsoon Discount', 'Flat 100 off on AC buses', 'FIXED', 100.0, NULL, 'AC_SEATER,AC_SLEEPER,AC_SEMI_SLEEPER,AC_LUXURY', '2026-06-01', '2026-09-30', 1, '2026-06-01 10:00:00');

-- ============================================================
-- 13. BOOKINGS
-- Entity columns: id, user_id, schedule_id, booking_reference,
--   status, total_fare, ticket_number, qr_code_string,
--   payment_status, contact_email, contact_phone, coupon_code,
--   coupon_discount, booked_at, updated_at, confirmed_at,
--   cancelled_at, completed_at, expires_at, cancellation_reason,
--   cancellation_reason_text, cancelled_seat_ids, total_refund_amount,
--   ticket_status
-- ============================================================
-- TARGET-SCHEMA COMPATIBILITY ADAPTATION (not present in the standalone source file):
-- user_id here is the integrated schema's UUID users.user_id, not the standalone Long
-- id. '44444444-...' is the demo admin@travelease.com account (source used numeric 1).
INSERT INTO bookings (user_id, schedule_id, booking_reference, status, total_fare, ticket_number, qr_code_string, payment_status, contact_email, contact_phone, coupon_code, coupon_discount, booked_at, updated_at, confirmed_at, completed_at, expires_at, ticket_status) VALUES
('44444444-4444-4444-4444-444444444444', 1, 'BK20260715A001', 'CONFIRMED', 1700.0, 'TKT-BK20260715A001', 'QR-BK20260715A001', 'COMPLETED', 'john@example.com', '9876543210', 'FIRST100', 170.0, '2026-07-01 10:00:00', '2026-07-01 10:00:00', '2026-07-01 10:05:00', NULL, '2026-07-15 23:00:00', 'ACTIVE'),
('44444444-4444-4444-4444-444444444444', 2, 'BK20260715A002', 'CONFIRMED', 2400.0, 'TKT-BK20260715A002', 'QR-BK20260715A002', 'COMPLETED', 'alice@example.com', '9876543211', NULL, 0.0, '2026-07-02 14:00:00', '2026-07-02 14:00:00', '2026-07-02 14:05:00', NULL, '2026-07-15 22:00:00', 'ACTIVE'),
('44444444-4444-4444-4444-444444444444', 3, 'BK20260716A003', 'COMPLETED', 2200.0, 'TKT-BK20260716A003', 'QR-BK20260716A003', 'COMPLETED', 'bob@example.com', '9876543212', 'SUMMER25', 550.0, '2026-07-05 09:00:00', '2026-07-16 06:00:00', '2026-07-05 09:05:00', '2026-07-16 06:00:00', NULL, 'JOURNEY_COMPLETED'),
('44444444-4444-4444-4444-444444444444', 1, 'BK20260715A004', 'CANCELLED', 850.0, 'TKT-BK20260715A004', 'QR-BK20260715A004', 'REFUNDED', 'charlie@example.com', '9876543213', NULL, 0.0, '2026-07-03 11:00:00', '2026-07-04 08:00:00', NULL, NULL, NULL, 'CANCELLED');

-- ============================================================
-- 14. BOOKING SEATS (passenger details)
-- Entity columns: id, booking_id, seat_id, passenger_name,
--   passenger_age, passenger_gender, passenger_email,
--   passenger_phone, is_primary, is_cancelled,
--   cancellation_charge, refund_amount
--
-- Invariant (booking-status/seed-consistency audit): booking.schedule.bus.id must equal
-- bookingSeat.seat.bus.id for every row. Booking 2 is on schedule_id=2 (bus 2, seat ids
-- 41-70) and booking 3 is on schedule_id=3 (bus 3, seat ids 71-82) - both previously
-- referenced seat_id 3/4, which actually belong to bus 1 (seat ids 1-40), a bus neither
-- booking's schedule uses. That cross-bus reference made the seat-availability query's
-- CONFIRMED/COMPLETED exclusion a silent no-op for these two rows (the wrong seat was
-- being "held"), so the correctly-owned bus-2/bus-3 seats stayed falsely bookable by a
-- new traveler. Fixed below to seat 41 ("S1", bus 2) and seat 71 ("SS1", bus 3) - the
-- first seat on each booking's actual bus, unclaimed by any other seeded row on that
-- schedule. Bookings 1 and 4 already correctly reference bus-1 seats (1, 2, 5) since
-- both are on schedule_id=1 (bus 1) - left unchanged.
-- ============================================================
INSERT INTO booking_seats (booking_id, seat_id, passenger_name, passenger_age, passenger_gender, passenger_email, passenger_phone, is_primary, is_cancelled, cancellation_charge, refund_amount) VALUES
(1, 1, 'John Doe', 28, 'Male', 'john@example.com', '9876543210', 1, 0, 0.0, 0.0),
(1, 2, 'Jane Doe', 25, 'Female', 'jane@example.com', '9876543211', 0, 0, 0.0, 0.0),
(2, 41, 'Alice Smith', 32, 'Female', 'alice@example.com', '9876543212', 1, 0, 0.0, 0.0),
(3, 71, 'Bob Johnson', 45, 'Male', 'bob@example.com', '9876543213', 1, 0, 0.0, 0.0),
(4, 5, 'Charlie Brown', 22, 'Male', 'charlie@example.com', '9876543214', 1, 1, 85.0, 765.0);

-- ============================================================
-- 15. REFUNDS
-- Entity columns: id, booking_id, refund_reference,
--   original_amount, cancellation_charge, gst_adjustment,
--   coupon_adjustment, net_refundable, status, reason,
--   rejection_reason, initiated_at, processed_at, approved_at,
--   completed_at, failed_at, rejected_at
-- ============================================================
INSERT INTO refunds (booking_id, refund_reference, original_amount, cancellation_charge, gst_adjustment, coupon_adjustment, net_refundable, status, reason, initiated_at, processed_at, completed_at) VALUES
(4, 'RF20260704R001', 850.0, 85.0, 4.25, 0.0, 760.75, 'COMPLETED', 'Customer cancellation', '2026-07-04 08:00:00', '2026-07-04 09:00:00', '2026-07-04 10:00:00');

-- ============================================================
-- 16. BOOKING TIMELINE
-- Entity columns: id, booking_id, event, description,
--   occurred_at, metadata
-- ============================================================
INSERT INTO booking_timeline (booking_id, event, description, occurred_at, metadata) VALUES
(1, 'BOOKING_CREATED', 'Booking created by user', '2026-07-01 10:00:00', NULL),
(1, 'PAYMENT_COMPLETED', 'Payment of 1700.0 completed', '2026-07-01 10:05:00', '{"amount":1700.0}'),
(1, 'BOOKING_CONFIRMED', 'Booking confirmed', '2026-07-01 10:05:00', NULL),
(1, 'TICKET_GENERATED', 'Ticket TKT-BK20260715A001 generated', '2026-07-01 10:05:00', NULL),
(2, 'BOOKING_CREATED', 'Booking created by user', '2026-07-02 14:00:00', NULL),
(2, 'PAYMENT_COMPLETED', 'Payment of 2400.0 completed', '2026-07-02 14:05:00', '{"amount":2400.0}'),
(2, 'BOOKING_CONFIRMED', 'Booking confirmed', '2026-07-02 14:05:00', NULL),
(3, 'BOOKING_CREATED', 'Booking created by user', '2026-07-05 09:00:00', NULL),
(3, 'BOOKING_CONFIRMED', 'Booking confirmed', '2026-07-05 09:05:00', NULL),
(3, 'BOOKING_COMPLETED', 'Journey completed', '2026-07-16 06:00:00', NULL),
(4, 'BOOKING_CREATED', 'Booking created by user', '2026-07-03 11:00:00', NULL),
(4, 'BOOKING_CANCELLED', 'Booking cancelled by user', '2026-07-04 08:00:00', '{"reason":"CHANGE_OF_PLANS"}'),
(4, 'REFUND_INITIATED', 'Refund RF20260704R001 initiated', '2026-07-04 08:00:00', NULL),
(4, 'REFUND_COMPLETED', 'Refund of 760.75 completed', '2026-07-04 10:00:00', '{"amount":760.75}');

-- ============================================================
-- 17. SEARCH HISTORY
-- Entity columns: id, user_id, source, destination,
--   travel_date, searched_at
-- ============================================================
-- TARGET-SCHEMA COMPATIBILITY ADAPTATION: user_id values are the integrated UUID
-- accounts (admin=44444444-..., traveler=55555555-...), replacing standalone numeric 1/2.
INSERT INTO search_history (user_id, source, destination, travel_date, searched_at) VALUES
('44444444-4444-4444-4444-444444444444', 'Bangalore', 'Chennai', '2026-07-15', '2026-06-28 10:00:00'),
('44444444-4444-4444-4444-444444444444', 'Bangalore', 'Hyderabad', '2026-07-16', '2026-06-29 14:00:00'),
('44444444-4444-4444-4444-444444444444', 'Mumbai', 'Pune', '2026-07-18', '2026-07-01 09:00:00'),
('55555555-5555-5555-5555-555555555555', 'Chennai', 'Hyderabad', '2026-07-20', '2026-07-02 11:00:00');

-- ============================================================
-- 18. SEAT LOCKS
-- Entity columns: id, seat_id, schedule_id, user_id,
--   locked_at, expires_at, status
-- ============================================================
-- TARGET-SCHEMA COMPATIBILITY ADAPTATION: user_id (3rd column) is the integrated UUID
-- admin account (44444444-...), replacing standalone numeric 1. seat_id/schedule_id
-- (Long, unrelated to users) are left unchanged.
INSERT INTO seat_locks (seat_id, schedule_id, user_id, locked_at, expires_at, status) VALUES
(6, 1, '44444444-4444-4444-4444-444444444444', '2026-07-01 09:50:00', '2026-07-01 10:05:00', 'EXPIRED'),
(7, 1, '44444444-4444-4444-4444-444444444444', '2026-07-01 09:50:00', '2026-07-01 10:05:00', 'EXPIRED');

-- ============================================================
-- 19. REPORT HISTORY
-- Entity columns: id, report_name, report_type, generated_at,
--   generated_by, applied_filters, export_format, record_count,
--   provider_id
-- ============================================================
INSERT INTO report_history (report_name, report_type, generated_at, generated_by, applied_filters, export_format, record_count, provider_id) VALUES
('Monthly Booking Report - June 2026', 'BOOKING', '2026-06-30 23:00:00', 'SYSTEM', '{"providerId":1,"startDate":"2026-06-01","endDate":"2026-06-30"}', 'CSV', 4, 1),
('Weekly Revenue Report', 'REVENUE', '2026-06-28 23:30:00', 'SYSTEM', '{"providerId":1}', 'EXCEL', 7, 1);

-- ============================================================
-- 20. PROVIDER 2 - COMPLETE BUSINESS DATASET (data/query-correctness stabilization pass)
--
-- Provider 2 ("Metro Express") gets its own fully independent fleet, staff, schedules,
-- trips, bookings and financials - not Provider 1 rows with providerId swapped - so that
-- provider isolation, provider-dashboard, analytics, and report endpoints all have real,
-- distinguishable Provider 2 data to return instead of an all-zero response. All new IDs
-- below continue each table's existing IDENTITY sequence from its current maximum (see
-- the running totals noted per table), so nothing here can collide with the Provider 1
-- rows above or with subsequently API-created rows.
--
-- Traveler-owned rows use user_id = 2 (traveler@travelease.com), the actual seeded
-- traveler account - not user_id = 1 (System Admin), which is what every Provider 1
-- booking above uses. That makes these bookings additionally useful for testing
-- "traveler views their own booking history" against a non-admin account, which the
-- existing Provider 1 data cannot exercise (ensureOwnership bypasses for ROLE_ADMIN, so
-- Provider 1's admin-owned bookings say nothing about traveler-scoped access).
-- ============================================================

-- --- 20a. BUSES (continues from id 6 -> ids 7, 8) ---
INSERT INTO buses (bus_number, bus_name, total_seats, bus_type, provider_id, status, created_at) VALUES
('KA07XY9999', 'Metro Express Deluxe', 20, 'AC_SEATER', 2, 'ACTIVE', '2026-01-07 10:00:00'),
('KA08MN8888', 'Metro Express Comfort', 16, 'NON_AC_SEATER', 2, 'MAINTENANCE', '2026-01-08 10:00:00');

INSERT INTO bus_amenities (bus_id, amenity) VALUES
(7, 'WiFi'), (7, 'AC'), (7, 'USB Charging'),
(8, 'USB Charging');

-- --- 20b. SEATS (continues from id 116 -> ids 117-152) ---
-- Bus 7: 20 seats (AC_SEATER), prefix "E" (Express)
INSERT INTO seats (bus_id, seat_number, seat_type, deck, status, version) VALUES
(7, 'E1', 'WINDOW', 1, 'AVAILABLE', 0), (7, 'E2', 'AISLE', 1, 'AVAILABLE', 0),
(7, 'E3', 'WINDOW', 1, 'AVAILABLE', 0), (7, 'E4', 'AISLE', 1, 'AVAILABLE', 0),
(7, 'E5', 'WINDOW', 1, 'AVAILABLE', 0), (7, 'E6', 'AISLE', 1, 'AVAILABLE', 0),
(7, 'E7', 'WINDOW', 1, 'AVAILABLE', 0), (7, 'E8', 'AISLE', 1, 'AVAILABLE', 0),
(7, 'E9', 'WINDOW', 1, 'AVAILABLE', 0), (7, 'E10', 'AISLE', 1, 'AVAILABLE', 0),
(7, 'E11', 'WINDOW', 2, 'AVAILABLE', 0), (7, 'E12', 'AISLE', 2, 'AVAILABLE', 0),
(7, 'E13', 'WINDOW', 2, 'AVAILABLE', 0), (7, 'E14', 'AISLE', 2, 'AVAILABLE', 0),
(7, 'E15', 'WINDOW', 2, 'AVAILABLE', 0), (7, 'E16', 'AISLE', 2, 'AVAILABLE', 0),
(7, 'E17', 'WINDOW', 2, 'AVAILABLE', 0), (7, 'E18', 'AISLE', 2, 'AVAILABLE', 0),
(7, 'E19', 'WINDOW', 2, 'AVAILABLE', 0), (7, 'E20', 'AISLE', 2, 'AVAILABLE', 0);

-- Bus 8: 16 seats (NON_AC_SEATER, bus itself is under MAINTENANCE), prefix "C" (Comfort)
INSERT INTO seats (bus_id, seat_number, seat_type, deck, status, version) VALUES
(8, 'C1', 'WINDOW', 1, 'MAINTENANCE', 0), (8, 'C2', 'AISLE', 1, 'MAINTENANCE', 0),
(8, 'C3', 'WINDOW', 1, 'MAINTENANCE', 0), (8, 'C4', 'AISLE', 1, 'MAINTENANCE', 0),
(8, 'C5', 'WINDOW', 1, 'MAINTENANCE', 0), (8, 'C6', 'AISLE', 1, 'MAINTENANCE', 0),
(8, 'C7', 'WINDOW', 1, 'MAINTENANCE', 0), (8, 'C8', 'AISLE', 1, 'MAINTENANCE', 0),
(8, 'C9', 'WINDOW', 2, 'MAINTENANCE', 0), (8, 'C10', 'AISLE', 2, 'MAINTENANCE', 0),
(8, 'C11', 'WINDOW', 2, 'MAINTENANCE', 0), (8, 'C12', 'AISLE', 2, 'MAINTENANCE', 0),
(8, 'C13', 'WINDOW', 2, 'MAINTENANCE', 0), (8, 'C14', 'AISLE', 2, 'MAINTENANCE', 0),
(8, 'C15', 'WINDOW', 2, 'MAINTENANCE', 0), (8, 'C16', 'AISLE', 2, 'MAINTENANCE', 0);

-- --- 20c. DRIVERS (continues from id 4 -> ids 5, 6) ---
-- driver 5 is ASSIGNED to trip 5 (SCHEDULED, not yet run); driver 6 is AVAILABLE,
-- matching TripServiceImpl's post-completion reset for trip 6 (COMPLETED).
INSERT INTO drivers (provider_id, name, license_number, phone, email, status, total_trips, total_distance_km, rating, active, created_at, updated_at) VALUES
(2, 'Arjun Mehta', 'DL-KA-2024-101', '9123456780', 'arjun.mehta@example.com', 'ASSIGNED', 0, 0.0, 4.2, 1, '2026-01-07 10:00:00', '2026-01-07 10:00:00'),
(2, 'Rohan Kapoor', 'DL-KA-2024-102', '9123456781', 'rohan.kapoor@example.com', 'AVAILABLE', 45, 15000.0, 4.4, 1, '2026-01-07 10:00:00', '2026-07-11 14:20:00');

-- --- 20d. CONDUCTORS (continues from id 3 -> ids 4, 5) ---
INSERT INTO conductors (provider_id, name, employee_id, phone, email, status, total_trips, rating, active, created_at, updated_at) VALUES
(2, 'Neha Singh', 'EMP-P2-001', '9123456790', 'neha.singh@example.com', 'ASSIGNED', 0, 4.1, 1, '2026-01-07 10:00:00', '2026-01-07 10:00:00'),
(2, 'Karan Malhotra', 'EMP-P2-002', '9123456791', 'karan.malhotra@example.com', 'AVAILABLE', 30, 4.3, 1, '2026-01-07 10:00:00', '2026-07-11 14:20:00');

-- --- 20e. MAINTENANCE (continues from id 5 -> id 6) ---
-- Coherent with bus 8's MAINTENANCE status: an IN_PROGRESS job, not just a future
-- SCHEDULED one, since the bus itself is currently marked unavailable for operation.
INSERT INTO maintenance_records (bus_id, maintenance_type, description, status, scheduled_date, completed_date, cost, next_maintenance_date, performed_by, created_at) VALUES
(8, 'AC_SERVICE', 'AC unit replacement', 'IN_PROGRESS', '2026-07-08', NULL, 18000.0, '2027-01-08', 'Metro Care Services', '2026-07-08 08:00:00');

-- --- 20f. ROUTES: Provider 2 schedules reuse existing shared routes (Route has no
-- provider ownership in the entity model - route_id=2 Bangalore-Hyderabad and
-- route_id=6 Bangalore-Coimbatore below are the same global routes Provider 1 can also
-- serve) ---

-- --- 20g. SCHEDULES (continues from id 7 -> ids 8, 9), both on bus 7 (the ACTIVE
-- Provider 2 bus - bus 8 is under maintenance and intentionally has no schedule) ---
INSERT INTO bus_schedules (bus_id, route_id, travel_date, departure_time, arrival_time, fare, available_seats, status, created_at, version) VALUES
(7, 2, '2026-07-19', '08:00:00', '17:00:00', 900.00, 20, 'SCHEDULED', '2026-01-10 10:00:00', 0),
(7, 6, '2026-07-12', '07:00:00', '14:30:00', 500.00, 20, 'SCHEDULED', '2026-01-10 10:00:00', 0);

-- --- 20h. FARE RULES (continues from id 7 -> ids 8, 9) - AC_SEATER on routes 2 and 6
-- previously only had AC_SEMI_SLEEPER/AC_SLEEPER fare rules, so a Provider 2 booking on
-- bus 7 (AC_SEATER) would otherwise have no matching rule for the fare calculator. ---
INSERT INTO fare_rules (route_id, bus_type, base_fare, gst_percent, cancellation_charge_percent, refund_percent, active, created_at, updated_at) VALUES
(2, 'AC_SEATER', 900.0, 5.0, 10.0, 90.0, 1, '2026-01-07 10:00:00', '2026-01-07 10:00:00'),
(6, 'AC_SEATER', 500.0, 5.0, 10.0, 90.0, 1, '2026-01-07 10:00:00', '2026-01-07 10:00:00');

-- --- 20i. TRIPS (continues from id 4 -> ids 5, 6) - one not-yet-completed, one
-- completed, both correctly Provider-2-owned throughout (schedule's bus, driver,
-- conductor all providerId = 2) ---
-- TARGET-SCHEMA COMPATIBILITY ADAPTATION: table is "bus_trips", not "trips" (see
-- Section 8's note above for why).
INSERT INTO bus_trips (schedule_id, driver_id, conductor_id, status, actual_departure_time, actual_arrival_time, delay_minutes, distance_covered_km, notes, created_at, updated_at) VALUES
(8, 5, 4, 'SCHEDULED', NULL, NULL, 0, 0.0, 'Upcoming trip', '2026-07-08 09:00:00', '2026-07-08 09:00:00'),
(9, 6, 5, 'COMPLETED', '2026-07-11 07:05:00', '2026-07-11 14:20:00', 5, 420.0, 'On-time arrival', '2026-07-11 06:00:00', '2026-07-11 14:20:00');

-- --- 20j. BOOKINGS (continues from id 4 -> ids 5, 6, 7) ---
-- Booking 5: CONFIRMED, schedule 8 (upcoming trip), coupon applied.
-- Booking 6: COMPLETED, schedule 9 (already-completed trip 6) - travelled successfully.
-- Booking 7: CANCELLED with a refund, also on schedule 8 (a different seat from
--   booking 5, so no seat conflict), exercising the cancellation/refund workflow.
-- TARGET-SCHEMA COMPATIBILITY ADAPTATION: user_id is the integrated UUID traveler
-- account (55555555-...), replacing standalone numeric 2.
INSERT INTO bookings (user_id, schedule_id, booking_reference, status, total_fare, ticket_number, qr_code_string, payment_status, contact_email, contact_phone, coupon_code, coupon_discount, booked_at, updated_at, confirmed_at, completed_at, expires_at, ticket_status) VALUES
('55555555-5555-5555-5555-555555555555', 8, 'BK2026P2B001', 'CONFIRMED', 850.0, 'TKT-BK2026P2B001', 'QR-BK2026P2B001', 'COMPLETED', 'ananya@example.com', '9123400001', 'WEEKEND50', 50.0, '2026-07-08 10:00:00', '2026-07-08 10:05:00', '2026-07-08 10:05:00', NULL, '2026-07-19 07:00:00', 'ACTIVE'),
('55555555-5555-5555-5555-555555555555', 9, 'BK2026P2B002', 'COMPLETED', 500.0, 'TKT-BK2026P2B002', 'QR-BK2026P2B002', 'COMPLETED', 'vikas@example.com', '9123400002', NULL, 0.0, '2026-07-09 11:00:00', '2026-07-11 14:20:00', '2026-07-09 11:05:00', '2026-07-11 14:20:00', NULL, 'JOURNEY_COMPLETED'),
('55555555-5555-5555-5555-555555555555', 8, 'BK2026P2B003', 'CANCELLED', 900.0, 'TKT-BK2026P2B003', 'QR-BK2026P2B003', 'REFUNDED', 'meera@example.com', '9123400003', NULL, 0.0, '2026-07-08 12:00:00', '2026-07-09 09:00:00', '2026-07-08 12:05:00', NULL, NULL, 'CANCELLED');

-- --- 20k. BOOKING SEATS (continues from id 5 -> ids 6, 7, 8) ---
-- Seat 117 = bus 7's "E1" - reused across bookings 5 (schedule 8) and 6 (schedule 9):
-- the same physical seat on two different travel dates is not a conflict, only the
-- same (schedule, seat) pair would be. Seat 118 = "E2", a different seat from booking
-- 5's on the SAME schedule 8, so no double-occupancy there either.
INSERT INTO booking_seats (booking_id, seat_id, passenger_name, passenger_age, passenger_gender, passenger_email, passenger_phone, is_primary, is_cancelled, cancellation_charge, refund_amount) VALUES
(5, 117, 'Ananya Rao', 29, 'Female', 'ananya@example.com', '9123400001', 1, 0, 0.0, 0.0),
(6, 117, 'Vikas Iyer', 34, 'Male', 'vikas@example.com', '9123400002', 1, 0, 0.0, 0.0),
(7, 118, 'Meera Nair', 27, 'Female', 'meera@example.com', '9123400003', 1, 1, 90.0, 805.5);

-- --- 20l. REFUNDS (continues from id 1 -> id 2) ---
INSERT INTO refunds (booking_id, refund_reference, original_amount, cancellation_charge, gst_adjustment, coupon_adjustment, net_refundable, status, reason, initiated_at, processed_at, completed_at) VALUES
(7, 'RF-P2-B003', 900.0, 90.0, 4.5, 0.0, 805.5, 'COMPLETED', 'Customer cancellation', '2026-07-09 09:00:00', '2026-07-09 09:30:00', '2026-07-09 10:00:00');

-- --- 20m. BOOKING TIMELINE ---
INSERT INTO booking_timeline (booking_id, event, description, occurred_at, metadata) VALUES
(5, 'BOOKING_CREATED', 'Booking created by user', '2026-07-08 10:00:00', NULL),
(5, 'PAYMENT_INITIATED', 'Payment initiated for amount 900.0', '2026-07-08 10:04:00', NULL),
(5, 'PAYMENT_COMPLETED', 'Coupon ''WEEKEND50'' applied, discount: 50.0', '2026-07-08 10:05:00', '{"amount":850.0}'),
(5, 'BOOKING_CONFIRMED', 'Booking confirmed', '2026-07-08 10:05:00', NULL),
(5, 'TICKET_GENERATED', 'Ticket TKT-BK2026P2B001 generated', '2026-07-08 10:05:00', NULL),
(6, 'BOOKING_CREATED', 'Booking created by user', '2026-07-09 11:00:00', NULL),
(6, 'BOOKING_CONFIRMED', 'Booking confirmed', '2026-07-09 11:05:00', NULL),
(6, 'TICKET_GENERATED', 'Ticket TKT-BK2026P2B002 generated', '2026-07-09 11:05:00', NULL),
(6, 'BOOKING_COMPLETED', 'Booking completed automatically after trip completion', '2026-07-11 14:20:00', NULL),
(7, 'BOOKING_CREATED', 'Booking created by user', '2026-07-08 12:00:00', NULL),
(7, 'BOOKING_CONFIRMED', 'Booking confirmed', '2026-07-08 12:05:00', NULL),
(7, 'BOOKING_CANCELLED', 'Booking cancelled by user', '2026-07-09 09:00:00', '{"reason":"CHANGE_OF_PLANS"}'),
(7, 'REFUND_INITIATED', 'Refund RF-P2-B003 initiated', '2026-07-09 09:00:00', NULL),
(7, 'REFUND_COMPLETED', 'Refund of 805.5 completed', '2026-07-09 10:00:00', '{"amount":805.5}');

-- Note (out-of-scope, pre-existing convention followed for consistency): bus_schedules
-- above set available_seats to the bus's full seat count regardless of the CONFIRMED/
-- COMPLETED bookings also seeded against that schedule, mirroring every Provider 1
-- schedule in this file (e.g. schedule 1 also stays at available_seats=40 despite
-- booking 1 holding 2 of its seats). Actual seat availability is computed dynamically
-- from booking_seats at request time (SeatRepository.findAvailableSeatsForSchedule), so
-- this column is purely informational seed content, not a source of truth - fixing it
-- only for Provider 2 would make the two providers' seed data inconsistent with each
-- other for no functional benefit, so it is left matching the established style.

-- ============================================================
-- 21. USERS (authentication)
-- Entity columns: id, name, email, phone, password_hash, role, provider_id, created_at
--
-- Per-row DEV-ONLY plaintext passwords (LOCAL DEVELOPMENT credentials only):
--   admin@travelease.com     -> Admin@123
--   traveler@travelease.com  -> Traveler@123
--   provider1@travelease.com -> Provider1@123
--   provider2@travelease.com -> Provider2@123
--
-- The BCrypt hashes below were generated with this application's actual
-- BCryptPasswordEncoder bean (see SecurityConfig.passwordEncoder(), default
-- strength 10) via src/test/java/com/busbooking/tools/DevSeedPasswordHashGeneratorTest,
-- which self-verifies each hash with encoder.matches(plaintext, hash) == true
-- before printing it. They replace an earlier shared hash whose only proven
-- plaintext was "password" (not the credentials above).
--
-- providerId is only meaningful for ROLE_PROVIDER rows; ADMIN/TRAVELER rows
-- leave it NULL.
--
-- TARGET-SCHEMA COMPATIBILITY ADAPTATION (not present in the standalone source file):
-- the integrated project's `users` table backs auth.entity.User, which extends a
-- shared BaseEntity whose primary key is a UUID assigned in Java (no database-side
-- generator) and which requires a NOT NULL `updated_at` audit column (populated only
-- via JPA auditing, never by raw SQL). The standalone schema's Long/IDENTITY `id`
-- column and its omission of `updated_at` are therefore incompatible here. Explicit,
-- deterministic UUIDs are supplied below (never present in the standalone file),
-- and `updated_at` is set equal to `created_at`. Names, emails, phones, BCrypt hashes,
-- roles, provider_id values, and created_at timestamps are otherwise unchanged from
-- the standalone source. Chosen UUIDs (44444444.../55555555.../66666666.../77777777...)
-- follow the same repeated-digit convention as, and do not collide with, the four
-- UUID constants already used by shared/config/DemoDataInitializer.java (which uses
-- 00000000..., 11111111..., 22222222..., 33333333..., aaaaaaaa..., bbbbbbbb...,
-- cccccccc..., dddddddd...).
-- ============================================================
-- Hotel Provider accounts (DEV-ONLY plaintext, documented for the same reason as
-- the transport providers above):
--   hotelprovider1@travelease.com -> HotelProvider1@123  (providerId 101)
--   hotelprovider2@travelease.com -> HotelProvider2@123  (providerId 102)
--   hotelprovider3@travelease.com -> HotelProvider3@123  (providerId 103)
-- Password hashes generated with this application's actual PasswordEncoder bean
-- (default strength 10), same method as the rows above.
-- ROLE_HOTEL_PROVIDER is a separate business actor from ROLE_PROVIDER (transport);
-- its providerId tenant namespace (101/102/103) is intentionally disjoint from the
-- transport providerId namespace (1/2) above - the two are never compared against
-- each other (see SecurityUtil.resolveEffectiveHotelProviderId).
INSERT INTO users (user_id, name, email, phone, password_hash, role, provider_id, status, security_question, security_answer_hash, created_at, updated_at) VALUES
('44444444-4444-4444-4444-444444444444', 'System Admin', 'admin@travelease.com', '9999900001', '$2a$10$PTatZMsZe.8Uq9FYlGVxEuQFlRq6IOJJWj9bb9jnCxGDDJ9TYxSFG', 'ROLE_ADMIN', NULL, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('55555555-5555-5555-5555-555555555555', 'Priya Nair', 'traveler@travelease.com', '9999900002', '$2a$10$LKPljvx/NXnDyWf5ZlzEw.HOzVIo./fRTXrwGdJXkE90xJ0IEAPlC', 'ROLE_TRAVELER', NULL, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('66666666-6666-6666-6666-666666666666', 'Sharma Travels Owner', 'provider1@travelease.com', '9999900003', '$2a$10$6sV0MN6YKyr1GSmVdt4SqOn.rDjIj.DbIVaqUT49nrlVpQLzDz7/O', 'ROLE_PROVIDER', 1, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('77777777-7777-7777-7777-777777777777', 'Metro Express Owner', 'provider2@travelease.com', '9999900004', '$2a$10$QsDEbXY9AJjVrxdVu0afZeoy5omnxvmU.5Ys56VsgA3ep.u9R4n46', 'ROLE_PROVIDER', 2, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e1000000-0000-0000-0000-000000000001', 'Grand Palace Hotels Owner', 'hotelprovider1@travelease.com', '9999900005', '$2a$10$IJDaiKMaNc5M1MBR28XbU.CQmw0yga.pKlJMMrbwruqbn2XqR/9JS', 'ROLE_HOTEL_PROVIDER', 101, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e1000000-0000-0000-0000-000000000002', 'Coastal Stays Owner', 'hotelprovider2@travelease.com', '9999900006', '$2a$10$VtU3P1q94slg1MuCa4mZ5ObmdQ5V648HI.LE52ndMx6nMYj.cH306', 'ROLE_HOTEL_PROVIDER', 102, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f1000000-0000-0000-0000-000000000001', 'Mumbai Adventures Owner', 'activityprovider1@travelease.com', '9999900007', '$2a$10$hbk0pveqX5qgbF81vFPivuAsu6W48GM85H8h.c625He3a3Aiue3PG', 'ROLE_ACTIVITY_PROVIDER', 201, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f1000000-0000-0000-0000-000000000002', 'Goa Watersports Owner', 'activityprovider2@travelease.com', '9999900008', '$2a$10$Lw2akz9Apgz/IfVAGWdRt.tmFY9cyemWPM1DbFugcQ8sNK37KC9jW', 'ROLE_ACTIVITY_PROVIDER', 202, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00');

-- ============================================================
-- 23. ACTIVITIES / ACTIVITY_SLOTS (Activity Provider tenant isolation)
-- Entity columns (physical names, confirmed via INFORMATION_SCHEMA.COLUMNS -
-- Spring Boot's default PhysicalNamingStrategy converts camelCase
-- @Column(name=...) values to snake_case even when an explicit name is given,
-- e.g. @Column(name="ActivityName") -> ACTIVITY_NAME, but "ActivityID" and
-- "DestinationID" fold to ACTIVITYID/DESTINATIONID with no inserted
-- underscore before the trailing ID):
--   activities: activityid, provider_id, destinationid, activity_name,
--               duration_hours, start_time, end_time, description
--   activity_slots: activity_slot_id, activity_id, activity_date, start_time,
--                    end_time, price, capacity, created_at, updated_at
--
-- Activity Provider accounts (DEV-ONLY plaintext, documented for the same
-- reason as the transport/hotel providers above):
--   activityprovider1@travelease.com -> ActivityProvider1@123  (providerId 201)
--   activityprovider2@travelease.com -> ActivityProvider2@123  (providerId 202)
-- ROLE_ACTIVITY_PROVIDER is a separate business actor from ROLE_PROVIDER
-- (transport) and ROLE_HOTEL_PROVIDER; its providerId tenant namespace
-- (201/202) is intentionally disjoint from both the transport namespace (1/2)
-- and the hotel namespace (101/102) - none are ever compared against each
-- other (see SecurityUtil.resolveEffectiveActivityProviderId).
--
-- Three activities per Activity Provider tenant (201 / 202) - deliberately
-- disjoint destinations/names/dates between the two tenants (Mumbai-flavored
-- for 201, Goa-flavored for 202) so cross-provider ownership checks have a
-- real Provider-B resource to be denied against, and so the Activity Provider
-- dashboard/reports demo shows two visibly different tenants rather than
-- mirrored data:
--   Provider 201 -> Heritage Walking Tour, Elephanta Caves Tour, Bollywood Studio Experience
--   Provider 202 -> Jet Ski Experience, Scuba Diving Adventure, Sunset Dolphin Cruise
-- Each activity has 1-2 slots split across the past (already-elapsed, for
-- ATTENDED/NO_SHOW/CANCELLED history) and the future (bookable/upcoming, for
-- CONFIRMED reservations), and activity_bookings below seeds a realistic mix
-- of statuses across both so the dashboard/bookings/capacity/reports pages
-- have real demo content instead of all-empty states out of the box.
-- ============================================================
INSERT INTO activities (activityid, provider_id, destinationid, activity_name, duration_hours, start_time, end_time, description) VALUES
('f2000000-0000-0000-0000-000000000001', 201, 1, 'Mumbai Heritage Walking Tour', 2.5, '09:00', '11:30', 'Guided walking tour of South Mumbai heritage sites'),
('f2000000-0000-0000-0000-000000000004', 201, 1, 'Elephanta Caves Boat & Heritage Tour', 3.5, '08:00', '11:30', 'Boat ride to Elephanta Island with a guided tour of the rock-cut caves'),
('f2000000-0000-0000-0000-000000000005', 201, 1, 'Bollywood Studio Experience', 2.0, '15:00', '17:00', 'Behind-the-scenes tour of a working Bollywood film studio'),
('f2000000-0000-0000-0000-000000000002', 202, 2, 'Goa Jet Ski Experience', 1.0, '10:00', '11:00', 'Guided jet ski session along Candolim beach'),
('f2000000-0000-0000-0000-000000000006', 202, 2, 'Goa Scuba Diving Adventure', 2.0, '07:00', '09:00', 'PADI-guided scuba diving experience off Grande Island'),
('f2000000-0000-0000-0000-000000000007', 202, 2, 'Sunset Dolphin Cruise', 1.5, '17:30', '19:00', 'Evening boat cruise to spot dolphins along the Goan coastline');

INSERT INTO activity_slots (activity_slot_id, activity_id, activity_date, start_time, end_time, price, capacity, created_at, updated_at) VALUES
('f3000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', '2026-09-05', '09:00:00', '11:30:00', 800.00, 15, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000001', '2026-09-06', '14:00:00', '16:30:00', 900.00, 10, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000005', 'f2000000-0000-0000-0000-000000000001', '2026-06-20', '09:00:00', '11:30:00', 800.00, 15, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000006', 'f2000000-0000-0000-0000-000000000001', '2026-07-05', '09:00:00', '11:30:00', 800.00, 15, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000007', 'f2000000-0000-0000-0000-000000000004', '2026-06-25', '08:00:00', '11:30:00', 1200.00, 20, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000008', 'f2000000-0000-0000-0000-000000000004', '2026-08-10', '08:00:00', '11:30:00', 1200.00, 20, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000009', 'f2000000-0000-0000-0000-000000000005', '2026-07-20', '15:00:00', '17:00:00', 1800.00, 12, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000003', 'f2000000-0000-0000-0000-000000000002', '2026-09-10', '10:00:00', '11:00:00', 1500.00, 6, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000004', 'f2000000-0000-0000-0000-000000000002', '2026-09-10', '12:00:00', '13:00:00', 1500.00, 6, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000010', 'f2000000-0000-0000-0000-000000000002', '2026-06-15', '10:00:00', '11:00:00', 1500.00, 6, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000011', 'f2000000-0000-0000-0000-000000000002', '2026-07-06', '10:00:00', '11:00:00', 1500.00, 6, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000012', 'f2000000-0000-0000-0000-000000000006', '2026-06-28', '07:00:00', '09:00:00', 3500.00, 8, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000013', 'f2000000-0000-0000-0000-000000000006', '2026-08-05', '07:00:00', '09:00:00', 3500.00, 8, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f3000000-0000-0000-0000-000000000014', 'f2000000-0000-0000-0000-000000000007', '2026-07-25', '17:30:00', '19:00:00', 1000.00, 25, '2026-01-01 09:00:00', '2026-01-01 09:00:00');

-- ============================================================
-- Itinerary suggestions per trip category (Solo=1, Couple=2, Family=3,
-- Friends=4, Corporate=5 - see RecommendationController). Previously
-- unseeded, so GET /api/recommendations always returned [] and the Trip
-- Overview "Recommended Activities" panel never had anything to show for
-- any demo trip. Every category gets at least two ranked entries, all
-- referencing the real activities seeded above.
-- ============================================================
INSERT INTO recommendations (recommendationid, categoryid, recommendation_type, referenceid, rank_order) VALUES
('r1000000-0000-0000-0000-000000000001', 1, 'Activity', 'f2000000-0000-0000-0000-000000000001', 1),
('r1000000-0000-0000-0000-000000000002', 1, 'Activity', 'f2000000-0000-0000-0000-000000000004', 2),
('r1000000-0000-0000-0000-000000000003', 2, 'Activity', 'f2000000-0000-0000-0000-000000000007', 1),
('r1000000-0000-0000-0000-000000000004', 2, 'Activity', 'f2000000-0000-0000-0000-000000000006', 2),
('r1000000-0000-0000-0000-000000000005', 3, 'Activity', 'f2000000-0000-0000-0000-000000000001', 1),
('r1000000-0000-0000-0000-000000000006', 3, 'Activity', 'f2000000-0000-0000-0000-000000000005', 2),
('r1000000-0000-0000-0000-000000000007', 4, 'Activity', 'f2000000-0000-0000-0000-000000000002', 1),
('r1000000-0000-0000-0000-000000000008', 4, 'Activity', 'f2000000-0000-0000-0000-000000000006', 2),
('r1000000-0000-0000-0000-000000000009', 5, 'Activity', 'f2000000-0000-0000-0000-000000000005', 1),
('r1000000-0000-0000-0000-000000000010', 5, 'Activity', 'f2000000-0000-0000-0000-000000000001', 2);

-- activity_bookings columns (BaseEntity id override + domain columns):
--   activity_booking_id, activity_slot_id, booked_by_user_id, participant_count,
--   price_per_participant, total_amount, status, booked_at, cancelled_at,
--   attendance_marked_at, trip_id, created_at, updated_at
-- All booked by the seeded traveler (traveler@travelease.com). Statuses mix
-- CONFIRMED (upcoming/actionable), ATTENDED/NO_SHOW (already marked, on
-- already-elapsed slots) and CANCELLED, with booked_at mostly in "the current
-- month" (2026-07) so Revenue (MTD) on the dashboard is non-zero out of the
-- box. f3...0006 and f3...0011 are deliberately elapsed-but-still-CONFIRMED
-- so the "Mark Attended / No-show" actions have a real target to demo live.
INSERT INTO activity_bookings (activity_booking_id, activity_slot_id, booked_by_user_id, participant_count, price_per_participant, total_amount, status, booked_at, cancelled_at, attendance_marked_at, trip_id, created_at, updated_at) VALUES
('f4000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 4, 800.00, 3200.00, 'ATTENDED', '2026-06-10 10:15:00', NULL, '2026-06-20 12:00:00', NULL, '2026-06-10 10:15:00', '2026-06-20 12:00:00'),
('f4000000-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 2, 800.00, 1600.00, 'NO_SHOW', '2026-06-12 09:00:00', NULL, '2026-06-20 12:05:00', NULL, '2026-06-12 09:00:00', '2026-06-20 12:05:00'),
('f4000000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000006', '55555555-5555-5555-5555-555555555555', 3, 800.00, 2400.00, 'CONFIRMED', '2026-07-01 11:00:00', NULL, NULL, NULL, '2026-07-01 11:00:00', '2026-07-01 11:00:00'),
('f4000000-0000-0000-0000-000000000004', 'f3000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 5, 800.00, 4000.00, 'CONFIRMED', '2026-07-03 16:20:00', NULL, NULL, NULL, '2026-07-03 16:20:00', '2026-07-03 16:20:00'),
('f4000000-0000-0000-0000-000000000005', 'f3000000-0000-0000-0000-000000000007', '55555555-5555-5555-5555-555555555555', 6, 1200.00, 7200.00, 'ATTENDED', '2026-06-15 09:00:00', NULL, '2026-06-25 13:00:00', NULL, '2026-06-15 09:00:00', '2026-06-25 13:00:00'),
('f4000000-0000-0000-0000-000000000006', 'f3000000-0000-0000-0000-000000000008', '55555555-5555-5555-5555-555555555555', 2, 1200.00, 2400.00, 'CONFIRMED', '2026-07-04 14:00:00', NULL, NULL, NULL, '2026-07-04 14:00:00', '2026-07-04 14:00:00'),
('f4000000-0000-0000-0000-000000000007', 'f3000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 2, 900.00, 1800.00, 'CANCELLED', '2026-07-02 08:30:00', '2026-07-06 10:00:00', NULL, NULL, '2026-07-02 08:30:00', '2026-07-06 10:00:00'),
('f4000000-0000-0000-0000-000000000008', 'f3000000-0000-0000-0000-000000000010', '55555555-5555-5555-5555-555555555555', 2, 1500.00, 3000.00, 'ATTENDED', '2026-06-05 12:00:00', NULL, '2026-06-15 12:30:00', NULL, '2026-06-05 12:00:00', '2026-06-15 12:30:00'),
('f4000000-0000-0000-0000-000000000009', 'f3000000-0000-0000-0000-000000000010', '55555555-5555-5555-5555-555555555555', 1, 1500.00, 1500.00, 'NO_SHOW', '2026-06-06 15:00:00', NULL, '2026-06-15 12:35:00', NULL, '2026-06-06 15:00:00', '2026-06-15 12:35:00'),
('f4000000-0000-0000-0000-000000000010', 'f3000000-0000-0000-0000-000000000011', '55555555-5555-5555-5555-555555555555', 2, 1500.00, 3000.00, 'CONFIRMED', '2026-07-02 09:45:00', NULL, NULL, NULL, '2026-07-02 09:45:00', '2026-07-02 09:45:00'),
('f4000000-0000-0000-0000-000000000011', 'f3000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 3, 1500.00, 4500.00, 'CONFIRMED', '2026-07-05 10:00:00', NULL, NULL, NULL, '2026-07-05 10:00:00', '2026-07-05 10:00:00'),
('f4000000-0000-0000-0000-000000000012', 'f3000000-0000-0000-0000-000000000012', '55555555-5555-5555-5555-555555555555', 2, 3500.00, 7000.00, 'ATTENDED', '2026-06-18 11:00:00', NULL, '2026-06-28 10:30:00', NULL, '2026-06-18 11:00:00', '2026-06-28 10:30:00'),
('f4000000-0000-0000-0000-000000000013', 'f3000000-0000-0000-0000-000000000013', '55555555-5555-5555-5555-555555555555', 4, 3500.00, 14000.00, 'CONFIRMED', '2026-07-06 17:00:00', NULL, NULL, NULL, '2026-07-06 17:00:00', '2026-07-06 17:00:00'),
('f4000000-0000-0000-0000-000000000014', 'f3000000-0000-0000-0000-000000000014', '55555555-5555-5555-5555-555555555555', 6, 1000.00, 6000.00, 'CONFIRMED', '2026-07-07 08:00:00', NULL, NULL, NULL, '2026-07-07 08:00:00', '2026-07-07 08:00:00'),
('f4000000-0000-0000-0000-000000000015', 'f3000000-0000-0000-0000-000000000014', '55555555-5555-5555-5555-555555555555', 8, 1000.00, 8000.00, 'CONFIRMED', '2026-07-07 09:15:00', NULL, NULL, NULL, '2026-07-07 09:15:00', '2026-07-07 09:15:00'),
('f4000000-0000-0000-0000-000000000016', 'f3000000-0000-0000-0000-000000000014', '55555555-5555-5555-5555-555555555555', 4, 1000.00, 4000.00, 'CANCELLED', '2026-07-04 14:00:00', '2026-07-08 09:00:00', NULL, NULL, '2026-07-04 14:00:00', '2026-07-08 09:00:00');

-- ============================================================
-- 22. HOTELS / ROOMS / HOTEL_BOOKINGS / HOTEL_REVIEWS (Hotel Provider tenant isolation)
-- Entity columns:
--   hotels: hotel_id, provider_id, destination_id, hotel_name, address, rating,
--           price_per_night, amenities, status, policies, created_at, updated_at
--   rooms: room_id, hotel_id, room_type, capacity, bed_type, price_per_night,
--          availability_status, created_at, updated_at
--   hotel_bookings: hotel_booking_id, trip_id, hotel_id, booked_by_user_id,
--                   check_in_date, check_out_date, room_type, room_number,
--                   total_amount, booking_status, created_at, updated_at
--   hotel_reviews: review_id, hotel_id, user_id, rating, comment, created_at, updated_at
--
-- One hotel per Hotel Provider tenant (101 / 102 / 103), deliberately disjoint
-- destinations/names/room mixes/booking dates between the three tenants so the
-- Hotel Partner dashboard/reports demo shows three visibly different tenants
-- rather than mirrored data, and so cross-provider ownership checks have real
-- Provider-B/C resources to be denied against:
--   Hotel A (provider 101) -> Grand Palace Mumbai   (dest 1, Mumbai)
--   Hotel B (provider 102) -> Coastal Stays Goa      (dest 2, Goa)
--   Hotel C (provider 103) -> Hilltown Manali Retreat (dest 3, Manali)
-- Each hotel has 3 room types (mix of AVAILABLE/MAINTENANCE units so Room
-- Inventory shows a real available/total ratio) and 6 bookings spanning
-- checked-out (past), checked-in/confirmed (spanning or starting "today",
-- 2026-07-09, so Bookings Today and the Occupancy Calendar are non-empty) and
-- one cancelled - booked_at is mostly early July 2026 so Revenue (MTD) is
-- non-zero out of the box. hotel_reviews seeds a believable rating snapshot
-- per hotel (never seeded before this).
-- ============================================================
INSERT INTO hotels (hotel_id, provider_id, destination_id, hotel_name, address, rating, price_per_night, amenities, status, policies, created_at, updated_at) VALUES
('e2000000-0000-0000-0000-000000000001', 101, 1, 'Grand Palace Mumbai', '1 Marine Drive, Mumbai', 4.20, 6000.00, 'WiFi, Pool, Breakfast', 'ACTIVE', 'Check-in 2 PM, Check-out 11 AM', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e2000000-0000-0000-0000-000000000002', 102, 2, 'Coastal Stays Goa', '22 Beach Road, Goa', 4.75, 4500.00, 'WiFi, Beach Access', 'ACTIVE', 'Check-in 12 PM, Check-out 10 AM', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e2000000-0000-0000-0000-000000000003', 103, 3, 'Hilltown Manali Retreat', '8 Mall Road, Manali', 4.50, 3200.00, 'WiFi, Bonfire, Mountain View', 'ACTIVE', 'Check-in 1 PM, Check-out 11 AM', '2026-01-01 09:00:00', '2026-01-01 09:00:00');

INSERT INTO rooms (room_id, hotel_id, room_type, capacity, bed_type, price_per_night, availability_status, created_at, updated_at) VALUES
-- Grand Palace Mumbai (10 rooms: 4 STANDARD, 3 DELUXE, 3 SUITE)
('e3000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'STANDARD', 2, 'QUEEN', 6000.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000005', 'e2000000-0000-0000-0000-000000000001', 'STANDARD', 2, 'QUEEN', 6000.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000006', 'e2000000-0000-0000-0000-000000000001', 'STANDARD', 2, 'QUEEN', 6000.00, 'MAINTENANCE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000007', 'e2000000-0000-0000-0000-000000000001', 'STANDARD', 2, 'QUEEN', 6000.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000001', 'DELUXE', 2, 'KING', 8500.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000008', 'e2000000-0000-0000-0000-000000000001', 'DELUXE', 2, 'KING', 8500.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000009', 'e2000000-0000-0000-0000-000000000001', 'DELUXE', 2, 'KING', 8500.00, 'MAINTENANCE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000010', 'e2000000-0000-0000-0000-000000000001', 'SUITE', 4, 'KING', 12000.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000011', 'e2000000-0000-0000-0000-000000000001', 'SUITE', 4, 'KING', 12000.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000012', 'e2000000-0000-0000-0000-000000000001', 'SUITE', 4, 'KING', 12000.00, 'MAINTENANCE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
-- Coastal Stays Goa (10 rooms: 4 STANDARD, 3 DELUXE, 3 VILLA)
('e3000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000002', 'STANDARD', 2, 'QUEEN', 4500.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000013', 'e2000000-0000-0000-0000-000000000002', 'STANDARD', 2, 'QUEEN', 4500.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000014', 'e2000000-0000-0000-0000-000000000002', 'STANDARD', 2, 'QUEEN', 4500.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000015', 'e2000000-0000-0000-0000-000000000002', 'STANDARD', 2, 'QUEEN', 4500.00, 'MAINTENANCE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-000000000002', 'DELUXE', 3, 'KING', 6200.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000016', 'e2000000-0000-0000-0000-000000000002', 'DELUXE', 3, 'KING', 6200.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000017', 'e2000000-0000-0000-0000-000000000002', 'DELUXE', 3, 'KING', 6200.00, 'MAINTENANCE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000018', 'e2000000-0000-0000-0000-000000000002', 'VILLA', 5, 'KING', 15000.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000019', 'e2000000-0000-0000-0000-000000000002', 'VILLA', 5, 'KING', 15000.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000020', 'e2000000-0000-0000-0000-000000000002', 'VILLA', 5, 'KING', 15000.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
-- Hilltown Manali Retreat (9 rooms: 3 STANDARD, 3 DELUXE, 3 COTTAGE)
('e3000000-0000-0000-0000-000000000021', 'e2000000-0000-0000-0000-000000000003', 'STANDARD', 2, 'QUEEN', 3200.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000022', 'e2000000-0000-0000-0000-000000000003', 'STANDARD', 2, 'QUEEN', 3200.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000023', 'e2000000-0000-0000-0000-000000000003', 'STANDARD', 2, 'QUEEN', 3200.00, 'MAINTENANCE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000024', 'e2000000-0000-0000-0000-000000000003', 'DELUXE', 3, 'KING', 4800.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000025', 'e2000000-0000-0000-0000-000000000003', 'DELUXE', 3, 'KING', 4800.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000026', 'e2000000-0000-0000-0000-000000000003', 'DELUXE', 3, 'KING', 4800.00, 'MAINTENANCE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000027', 'e2000000-0000-0000-0000-000000000003', 'COTTAGE', 5, 'KING', 7500.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000028', 'e2000000-0000-0000-0000-000000000003', 'COTTAGE', 5, 'KING', 7500.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e3000000-0000-0000-0000-000000000029', 'e2000000-0000-0000-0000-000000000003', 'COTTAGE', 5, 'KING', 7500.00, 'AVAILABLE', '2026-01-01 09:00:00', '2026-01-01 09:00:00');

INSERT INTO hotel_bookings (hotel_booking_id, trip_id, hotel_id, booked_by_user_id, check_in_date, check_out_date, room_type, room_number, total_amount, booking_status, created_at, updated_at) VALUES
-- Grand Palace Mumbai
('e4000000-0000-0000-0000-000000000001', NULL, 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '2026-07-01', '2026-07-04', 'STANDARD', '101', 18000.00, 'CHECKED_OUT', '2026-06-25 10:00:00', '2026-06-25 10:00:00'),
('e4000000-0000-0000-0000-000000000002', NULL, 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '2026-07-08', '2026-07-11', 'DELUXE', '201', 25500.00, 'CHECKED_IN', '2026-07-05 09:00:00', '2026-07-05 09:00:00'),
('e4000000-0000-0000-0000-000000000003', NULL, 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '2026-07-09', '2026-07-12', 'SUITE', '301', 36000.00, 'CONFIRMED', '2026-07-07 11:30:00', '2026-07-07 11:30:00'),
('e4000000-0000-0000-0000-000000000004', NULL, 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '2026-07-15', '2026-07-17', 'STANDARD', '102', 12000.00, 'CONFIRMED', '2026-07-06 14:00:00', '2026-07-06 14:00:00'),
('e4000000-0000-0000-0000-000000000005', NULL, 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '2026-07-20', '2026-07-22', 'DELUXE', '202', 17000.00, 'CONFIRMED', '2026-07-08 16:00:00', '2026-07-08 16:00:00'),
('e4000000-0000-0000-0000-000000000006', NULL, 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '2026-07-12', '2026-07-14', 'SUITE', '302', 24000.00, 'CANCELLED', '2026-07-03 09:20:00', '2026-07-03 09:20:00'),
-- Coastal Stays Goa
('e4000000-0000-0000-0000-000000000007', NULL, 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '2026-07-02', '2026-07-05', 'STANDARD', '101', 13500.00, 'CHECKED_OUT', '2026-06-28 08:30:00', '2026-06-28 08:30:00'),
('e4000000-0000-0000-0000-000000000008', NULL, 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '2026-07-09', '2026-07-13', 'VILLA', '301', 60000.00, 'CONFIRMED', '2026-07-07 12:00:00', '2026-07-07 12:00:00'),
('e4000000-0000-0000-0000-000000000009', NULL, 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '2026-07-08', '2026-07-10', 'DELUXE', '201', 12400.00, 'CHECKED_IN', '2026-07-04 10:00:00', '2026-07-04 10:00:00'),
('e4000000-0000-0000-0000-000000000010', NULL, 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '2026-07-18', '2026-07-20', 'STANDARD', '102', 9000.00, 'CONFIRMED', '2026-07-08 13:00:00', '2026-07-08 13:00:00'),
('e4000000-0000-0000-0000-000000000011', NULL, 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '2026-07-25', '2026-07-28', 'VILLA', '302', 45000.00, 'CONFIRMED', '2026-07-06 15:30:00', '2026-07-06 15:30:00'),
('e4000000-0000-0000-0000-000000000012', NULL, 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '2026-07-14', '2026-07-16', 'STANDARD', '103', 9000.00, 'CANCELLED', '2026-07-02 09:00:00', '2026-07-02 09:00:00'),
-- Hilltown Manali Retreat
('e4000000-0000-0000-0000-000000000013', NULL, 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', '2026-07-03', '2026-07-06', 'COTTAGE', '301', 22500.00, 'CHECKED_OUT', '2026-06-27 09:00:00', '2026-06-27 09:00:00'),
('e4000000-0000-0000-0000-000000000014', NULL, 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', '2026-07-09', '2026-07-11', 'STANDARD', '101', 6400.00, 'CONFIRMED', '2026-07-07 10:15:00', '2026-07-07 10:15:00'),
('e4000000-0000-0000-0000-000000000015', NULL, 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', '2026-07-07', '2026-07-10', 'DELUXE', '201', 14400.00, 'CHECKED_IN', '2026-07-03 11:00:00', '2026-07-03 11:00:00'),
('e4000000-0000-0000-0000-000000000016', NULL, 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', '2026-07-17', '2026-07-19', 'COTTAGE', '302', 15000.00, 'CONFIRMED', '2026-07-08 08:45:00', '2026-07-08 08:45:00'),
('e4000000-0000-0000-0000-000000000017', NULL, 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', '2026-07-22', '2026-07-24', 'STANDARD', '102', 6400.00, 'CONFIRMED', '2026-07-05 17:00:00', '2026-07-05 17:00:00'),
('e4000000-0000-0000-0000-000000000018', NULL, 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', '2026-07-13', '2026-07-15', 'DELUXE', '202', 9600.00, 'CANCELLED', '2026-07-01 09:30:00', '2026-07-01 09:30:00');

INSERT INTO hotel_reviews (review_id, hotel_id, user_id, rating, comment, created_at, updated_at) VALUES
-- Grand Palace Mumbai
('e5000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 5.00, 'Stunning views of Marine Drive and impeccable service.', '2026-06-26 09:00:00', '2026-06-26 09:00:00'),
('e5000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 5.00, 'Breakfast spread was fantastic, will book again.', '2026-06-29 10:00:00', '2026-06-29 10:00:00'),
('e5000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 4.00, 'Great location, rooms a little smaller than expected.', '2026-07-02 11:00:00', '2026-07-02 11:00:00'),
('e5000000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 4.00, 'Friendly staff, pool area was very relaxing.', '2026-07-04 12:00:00', '2026-07-04 12:00:00'),
('e5000000-0000-0000-0000-000000000005', 'e2000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 3.00, 'Decent stay but the wifi was patchy on the top floor.', '2026-07-06 13:00:00', '2026-07-06 13:00:00'),
-- Coastal Stays Goa
('e5000000-0000-0000-0000-000000000006', 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 5.00, 'Steps from the beach, easily the best stay in Goa.', '2026-06-30 09:00:00', '2026-06-30 09:00:00'),
('e5000000-0000-0000-0000-000000000007', 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 5.00, 'Villa was spacious and the staff arranged a great sunset cruise.', '2026-07-03 10:00:00', '2026-07-03 10:00:00'),
('e5000000-0000-0000-0000-000000000008', 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 4.00, 'Lovely property, breakfast could use more variety.', '2026-07-05 11:00:00', '2026-07-05 11:00:00'),
('e5000000-0000-0000-0000-000000000009', 'e2000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 5.00, 'Perfect for a group getaway, would come back every year.', '2026-07-07 12:00:00', '2026-07-07 12:00:00'),
-- Hilltown Manali Retreat
('e5000000-0000-0000-0000-000000000010', 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 4.00, 'Cosy cottages with a stunning mountain view.', '2026-06-28 09:00:00', '2026-06-28 09:00:00'),
('e5000000-0000-0000-0000-000000000011', 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 5.00, 'Bonfire evenings were the highlight of our trip.', '2026-07-01 10:00:00', '2026-07-01 10:00:00'),
('e5000000-0000-0000-0000-000000000012', 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 5.00, 'Warm hospitality, felt like a home away from home.', '2026-07-04 11:00:00', '2026-07-04 11:00:00'),
('e5000000-0000-0000-0000-000000000013', 'e2000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 4.00, 'Great value for money, road up was a bit bumpy though.', '2026-07-06 12:00:00', '2026-07-06 12:00:00');

-- ============================================================
-- SEED DATA COMPLETE
-- ============================================================

-- ====== ADDED BY AGENT: Mumbai to Goa Buses ======
INSERT INTO routes (source, destination, distance_km, duration_hours, status, created_at) VALUES ('Mumbai', 'Goa', 600.0, 12.0, 'ACTIVE', '2026-01-01 10:00:00');
INSERT INTO bus_schedules (bus_id, route_id, travel_date, departure_time, arrival_time, fare, available_seats, status, created_at, version) VALUES (1, 8, '2026-07-11', '20:00:00', '08:00:00', 1500.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0);
INSERT INTO bus_schedules (bus_id, route_id, travel_date, departure_time, arrival_time, fare, available_seats, status, created_at, version) VALUES (1, 8, '2026-07-13', '20:00:00', '08:00:00', 1500.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0);
INSERT INTO bus_schedules (bus_id, route_id, travel_date, departure_time, arrival_time, fare, available_seats, status, created_at, version) VALUES (1, 8, '2026-07-15', '20:00:00', '08:00:00', 1500.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0);
INSERT INTO bus_schedules (bus_id, route_id, travel_date, departure_time, arrival_time, fare, available_seats, status, created_at, version) VALUES (1, 8, '2026-07-17', '20:00:00', '08:00:00', 1500.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0);
INSERT INTO bus_schedules (bus_id, route_id, travel_date, departure_time, arrival_time, fare, available_seats, status, created_at, version) VALUES (1, 8, '2026-07-19', '20:00:00', '08:00:00', 1500.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0);
INSERT INTO bus_schedules (bus_id, route_id, travel_date, departure_time, arrival_time, fare, available_seats, status, created_at, version) VALUES (1, 8, '2026-07-21', '20:00:00', '08:00:00', 1500.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0);
INSERT INTO bus_schedules (bus_id, route_id, travel_date, departure_time, arrival_time, fare, available_seats, status, created_at, version) VALUES (1, 8, '2026-07-23', '20:00:00', '08:00:00', 1500.00, 40, 'SCHEDULED', '2026-01-10 10:00:00', 0);

-- ====== ADDED BY AGENT: Dummy Destinations and Hotels ======

INSERT INTO destinations (destination_name, state, country, description, is_active) VALUES 
('Goa', 'Goa', 'India', 'Beach destination', 1),
('Mumbai', 'Maharashtra', 'India', 'City of dreams', 1);

INSERT INTO hotels (destination_id, hotel_name, address, star_rating, status, created_at, updated_at) VALUES 
(1, 'Taj Exotica', 'Benaulim, Goa', 5, 'ACTIVE', '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(1, 'Goa Marriott', 'Panjim, Goa', 5, 'ACTIVE', '2026-01-01 10:00:00', '2026-01-01 10:00:00'),
(2, 'Taj Mahal Palace', 'Colaba, Mumbai', 5, 'ACTIVE', '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT INTO hotel_rooms (hotel_id, room_type, price_per_night, total_rooms, available_rooms, status) VALUES 
(1, 'Standard', 8000.00, 20, 20, 'ACTIVE'),
(1, 'Deluxe', 12000.00, 10, 10, 'ACTIVE'),
(2, 'Standard', 7000.00, 15, 15, 'ACTIVE'),
(3, 'Standard', 15000.00, 30, 30, 'ACTIVE');

-- ====== ADDED BY AGENT: Trips and Expenses Dummy Data ======
-- Add a dummy trip for user
INSERT INTO trips (trip_id, trip_name, organizer_id, source_location, destination_id, budget_amount, category_id, start_date, end_date, status, created_at, updated_at) VALUES
('TRP-001', 'Goa Trip', '44444444-4444-4444-4444-444444444444', 'Mumbai', 1, 50000.00, 1, '2026-07-20', '2026-07-25', 'PLANNING', '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT INTO trip_members (trip_id, user_id, member_status, joined_date, budget_amount) VALUES
('TRP-001', '44444444-4444-4444-4444-444444444444', 'ACCEPTED', '2026-01-01 10:00:00', 50000.00);

-- Hotel Booking
INSERT INTO trip_hotel_bookings (trip_id, hotel_id, check_in_date, check_out_date, room_type, room_number, total_amount, booking_status) VALUES
('TRP-001', 1, '2026-07-20', '2026-07-25', 'Standard', '101', 40000.00, 'CONFIRMED');

-- Expense
INSERT INTO expenses (trip_id, payer_id, amount, expense_date, description, category_id, receipt_url, created_at, updated_at) VALUES
('TRP-001', '44444444-4444-4444-4444-444444444444', 5000.00, '2026-07-21', 'Food and Drinks', 1, NULL, '2026-07-21 10:00:00', '2026-07-21 10:00:00');
