import { User } from '../models/user.model';
import { Trip, TripMember } from '../models/trip.model';
import { Invitation } from '../models/invitation.model';
import { Notification } from '../models/notification.model';
import { Expense, BudgetSummary } from '../models/expense.model';
import { Settlement } from '../models/settlement.model';
import { Hotel, HotelRoom, HotelBooking, HotelReview, Destination } from '../models/hotel.model';
import { Transport, Vehicle, TransportBooking, TransportRoute } from '../models/transport.model';
import { Activity, ActivityBooking, ActivityCapacitySlot, Attraction } from '../models/activity.model';
import { Itinerary } from '../models/itinerary.model';
import { Delay, RescheduleSuggestion } from '../models/delay.model';

// ---------- USERS ----------

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Arjun Sharma',
    email: 'arjun@example.com',
    phone: '+91 98765 43210',
    role: 'TRAVELER',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'u2',
    name: 'Priya Nair',
    email: 'priya@example.com',
    phone: '+91 87654 32109',
    role: 'TRAVELER',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
    createdAt: '2025-02-10T10:00:00Z',
  },
  {
    id: 'u3',
    name: 'Rahul Verma',
    email: 'rahul@example.com',
    phone: '+91 76543 21098',
    role: 'TRAVELER',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul',
    createdAt: '2025-03-05T10:00:00Z',
  },
  {
    id: 'admin1',
    name: 'Meera Admin',
    email: 'admin@travelease.com',
    phone: '+91 99999 00001',
    role: 'ADMIN',
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: 'hp1',
    name: 'Grand Royale Hotels',
    email: 'hotels@grandroyale.com',
    phone: '+91 88888 00001',
    role: 'HOTEL_PROVIDER',
    createdAt: '2025-01-01T10:00:00Z',
  },
  {
    id: 'tp1',
    name: 'FastTrack Transport',
    email: 'ops@fasttrack.com',
    phone: '+91 77777 00001',
    role: 'TRANSPORT_PROVIDER',
    createdAt: '2025-01-01T10:00:00Z',
  },
  {
    id: 'ap1',
    name: 'Adventure Plus Activities',
    email: 'ops@adventureplus.com',
    phone: '+91 66666 00001',
    role: 'ACTIVITY_PROVIDER',
    createdAt: '2025-01-01T10:00:00Z',
  },
];

export const MOCK_TRAVELER = MOCK_USERS[0];

// ---------- DESTINATIONS ----------

export const MOCK_DESTINATIONS: Destination[] = [
  { id: 'd1', name: 'Goa', country: 'India', description: 'Sun, sand, and seafood on India\'s western coast.', imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400', popularAttractions: ['Baga Beach', 'Fort Aguada', 'Dudhsagar Waterfalls'] },
  { id: 'd2', name: 'Manali', country: 'India', description: 'A high-altitude Himalayan resort town with snow-capped peaks.', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', popularAttractions: ['Rohtang Pass', 'Hadimba Temple', 'Solang Valley'] },
  { id: 'd3', name: 'Rajasthan', country: 'India', description: 'The land of maharajas with forts, palaces and desert.', imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=400', popularAttractions: ['Amber Fort', 'City Palace', 'Mehrangarh Fort'] },
  { id: 'd4', name: 'Kerala', country: 'India', description: 'God\'s own country — backwaters, spices and wildlife.', imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400', popularAttractions: ['Alleppey Backwaters', 'Munnar Tea Gardens', 'Periyar Wildlife Sanctuary'] },
];

// ---------- TRIPS ----------

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trip1',
    name: 'Goa Beach Escape',
    source: 'Mumbai',
    destination: 'Goa',
    destinationId: 'd1',
    startDate: '2026-08-10',
    endDate: '2026-08-17',
    status: 'UPCOMING',
    travelerCategory: 'FRIENDS',
    organizerId: 'u1',
    memberCount: 5,
    budgetAmount: 45000,
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600',
    createdAt: '2026-06-20T10:00:00Z',
  },
  {
    id: 'trip2',
    name: 'Manali Snow Adventure',
    source: 'Delhi',
    destination: 'Manali',
    destinationId: 'd2',
    startDate: '2026-07-15',
    endDate: '2026-07-22',
    status: 'ACTIVE',
    travelerCategory: 'COUPLE',
    organizerId: 'u1',
    memberCount: 2,
    budgetAmount: 30000,
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
    createdAt: '2026-05-10T10:00:00Z',
  },
  {
    id: 'trip3',
    name: 'Rajasthan Heritage Tour',
    source: 'Ahmedabad',
    destination: 'Rajasthan',
    destinationId: 'd3',
    startDate: '2026-04-01',
    endDate: '2026-04-10',
    status: 'COMPLETED',
    travelerCategory: 'FAMILY',
    organizerId: 'u2',
    memberCount: 6,
    budgetAmount: 80000,
    coverImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'trip4',
    name: 'Kerala Backwaters',
    source: 'Bangalore',
    destination: 'Kerala',
    destinationId: 'd4',
    startDate: '2026-09-05',
    endDate: '2026-09-10',
    status: 'UPCOMING',
    travelerCategory: 'SOLO',
    organizerId: 'u3',
    memberCount: 1,
    budgetAmount: 20000,
    coverImage: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600',
    createdAt: '2026-07-01T10:00:00Z',
  },
];

export const MOCK_TRIP_MEMBERS: TripMember[] = [
  { id: 'tm1', tripId: 'trip1', userId: 'u1', userName: 'Arjun Sharma', userEmail: 'arjun@example.com', role: 'ORGANIZER', joinedAt: '2026-06-20T10:00:00Z' },
  { id: 'tm2', tripId: 'trip1', userId: 'u2', userName: 'Priya Nair', userEmail: 'priya@example.com', role: 'MEMBER', joinedAt: '2026-06-21T10:00:00Z' },
  { id: 'tm3', tripId: 'trip1', userId: 'u3', userName: 'Rahul Verma', userEmail: 'rahul@example.com', role: 'MEMBER', joinedAt: '2026-06-22T10:00:00Z' },
];

// ---------- INVITATIONS ----------

export const MOCK_INVITATIONS: Invitation[] = [
  {
    id: 'inv1',
    tripId: 'trip1',
    tripName: 'Goa Beach Escape',
    tripDestination: 'Goa',
    tripStartDate: '2026-08-10',
    inviterId: 'u2',
    inviterName: 'Priya Nair',
    inviteeEmail: 'arjun@example.com',
    inviteeId: 'u1',
    status: 'PENDING',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'inv2',
    tripId: 'trip2',
    tripName: 'Manali Snow Adventure',
    tripDestination: 'Manali',
    tripStartDate: '2026-07-15',
    inviterId: 'u3',
    inviterName: 'Rahul Verma',
    inviteeEmail: 'arjun@example.com',
    inviteeId: 'u1',
    status: 'PENDING',
    createdAt: '2026-07-02T10:00:00Z',
  },
];

// ---------- NOTIFICATIONS ----------

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'u1', type: 'TRIP_INVITATION', title: 'Trip Invitation', message: 'Priya Nair invited you to Goa Beach Escape', read: false, tripId: 'trip1', tripName: 'Goa Beach Escape', createdAt: '2026-07-01T10:00:00Z' },
  { id: 'n2', userId: 'u1', type: 'ACTIVITY_REMINDER', title: 'Activity Reminder', message: 'Parasailing at Baga Beach starts in 2 hours!', read: false, tripId: 'trip2', tripName: 'Manali Snow Adventure', createdAt: '2026-07-05T08:00:00Z' },
  { id: 'n3', userId: 'u1', type: 'EXPENSE_ADDED', title: 'New Expense', message: 'Rahul added ₹3,200 for dinner to Goa Beach Escape', read: true, tripId: 'trip1', tripName: 'Goa Beach Escape', createdAt: '2026-07-03T19:00:00Z' },
  { id: 'n4', userId: 'u1', type: 'SETTLEMENT_PAID', title: 'Settlement Paid', message: 'Priya marked ₹1,600 as paid to you', read: true, tripId: 'trip1', createdAt: '2026-07-04T12:00:00Z' },
  { id: 'n5', userId: 'u1', type: 'DEPARTURE_ALERT', title: 'Time to Leave!', message: 'Leave now for Rohtang Pass to arrive on time at 09:00', read: false, tripId: 'trip2', createdAt: '2026-07-05T07:30:00Z' },
];

// ---------- EXPENSES ----------

export const MOCK_EXPENSES: Expense[] = [
  {
    id: 'exp1',
    tripId: 'trip1',
    amount: 3200,
    category: 'FOOD',
    description: 'Dinner at Fisherman\'s Wharf',
    expenseDate: '2026-08-11',
    payerId: 'u1',
    payerName: 'Arjun Sharma',
    participantIds: ['u1', 'u2', 'u3'],
    splitType: 'EQUAL',
    createdAt: '2026-08-11T20:00:00Z',
  },
  {
    id: 'exp2',
    tripId: 'trip1',
    amount: 8500,
    category: 'ACTIVITIES',
    description: 'Parasailing + Water Sports Package',
    expenseDate: '2026-08-12',
    payerId: 'u2',
    payerName: 'Priya Nair',
    participantIds: ['u1', 'u2', 'u3'],
    splitType: 'EQUAL',
    createdAt: '2026-08-12T14:00:00Z',
  },
  {
    id: 'exp3',
    tripId: 'trip1',
    amount: 12000,
    category: 'ACCOMMODATION',
    description: 'Hotel booking night 1–3',
    expenseDate: '2026-08-10',
    payerId: 'u1',
    payerName: 'Arjun Sharma',
    participantIds: ['u1', 'u2', 'u3'],
    splitType: 'EQUAL',
    createdAt: '2026-08-10T14:00:00Z',
  },
];

// ---------- BUDGET SUMMARY ----------

export const MOCK_BUDGET_SUMMARY: BudgetSummary = {
  tripId: 'trip1',
  budgetAmount: 45000,
  totalSpent: 23700,
  remaining: 21300,
  usagePercentage: 52.7,
  isOverspent: false,
  categoryBreakdown: [
    { category: 'ACCOMMODATION', amount: 12000 },
    { category: 'ACTIVITIES', amount: 8500 },
    { category: 'FOOD', amount: 3200 },
  ],
};

// ---------- SETTLEMENTS ----------

export const MOCK_SETTLEMENTS: Settlement[] = [
  { id: 's1', tripId: 'trip1', fromUserId: 'u2', fromUserName: 'Priya Nair', toUserId: 'u1', toUserName: 'Arjun Sharma', amount: 5067, status: 'PENDING', createdAt: '2026-08-13T10:00:00Z' },
  { id: 's2', tripId: 'trip1', fromUserId: 'u3', fromUserName: 'Rahul Verma', toUserId: 'u1', toUserName: 'Arjun Sharma', amount: 3367, status: 'PENDING', createdAt: '2026-08-13T10:00:00Z' },
  { id: 's3', tripId: 'trip1', fromUserId: 'u3', fromUserName: 'Rahul Verma', toUserId: 'u2', toUserName: 'Priya Nair', amount: 1700, status: 'PAID', paidAt: '2026-08-14T15:00:00Z', createdAt: '2026-08-13T10:00:00Z' },
];

// ---------- HOTELS ----------

export const MOCK_HOTELS: Hotel[] = [
  { id: 'h1', name: 'Grand Royale Goa', destinationId: 'd1', destinationName: 'Goa', address: 'Baga Beach Road, Calangute, Goa', rating: 4.5, reviewCount: 234, pricePerNight: 5500, amenities: ['Pool', 'WiFi', 'Restaurant', 'Spa', 'Gym', 'Beach Access'], imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', description: 'Luxury beach resort with stunning sea views and world-class amenities.' },
  { id: 'h2', name: 'Sunset Palms Resort', destinationId: 'd1', destinationName: 'Goa', address: 'Anjuna Beach, North Goa', rating: 4.2, reviewCount: 156, pricePerNight: 3800, amenities: ['Pool', 'WiFi', 'Bar', 'Garden', 'Parking'], imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', description: 'Charming boutique resort surrounded by lush tropical gardens.' },
  { id: 'h3', name: 'Snow Peak Manali', destinationId: 'd2', destinationName: 'Manali', address: 'Mall Road, Manali, HP', rating: 4.4, reviewCount: 189, pricePerNight: 4200, amenities: ['WiFi', 'Restaurant', 'Bonfire', 'Mountain View', 'Room Service'], imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400', description: 'Cozy mountain hotel with breathtaking views of the Himalayas.' },
  { id: 'h4', name: 'Heritage Haveli Jaipur', destinationId: 'd3', destinationName: 'Rajasthan', address: 'Near Amer Fort, Jaipur, Rajasthan', rating: 4.7, reviewCount: 312, pricePerNight: 6500, amenities: ['Pool', 'WiFi', 'Restaurant', 'Cultural Events', 'Spa', 'Courtyard'], imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', description: 'Authentic Rajasthani palace turned luxury heritage hotel.' },
];

export const MOCK_HOTEL_ROOMS: HotelRoom[] = [
  { id: 'r1', hotelId: 'h1', type: 'STANDARD', name: 'Sea View Standard', capacity: 2, pricePerNight: 5500, amenities: ['AC', 'TV', 'WiFi', 'Sea View'], available: true },
  { id: 'r2', hotelId: 'h1', type: 'DELUXE', name: 'Deluxe Pool View', capacity: 2, pricePerNight: 7500, amenities: ['AC', 'TV', 'WiFi', 'Pool View', 'Jacuzzi'], available: true },
  { id: 'r3', hotelId: 'h1', type: 'FAMILY', name: 'Family Suite', capacity: 4, pricePerNight: 10500, amenities: ['AC', 'TV', 'WiFi', 'Sea View', 'Living Area'], available: false },
  { id: 'r4', hotelId: 'h2', type: 'STANDARD', name: 'Garden View Room', capacity: 2, pricePerNight: 3800, amenities: ['AC', 'TV', 'WiFi', 'Garden View'], available: true },
];

export const MOCK_HOTEL_BOOKINGS: HotelBooking[] = [
  { id: 'hb1', tripId: 'trip1', hotelId: 'h1', hotelName: 'Grand Royale Goa', roomId: 'r1', roomType: 'STANDARD', checkIn: '2026-08-10', checkOut: '2026-08-17', totalAmount: 38500, status: 'CONFIRMED', guestCount: 2, createdAt: '2026-06-25T10:00:00Z' },
  { id: 'hb2', tripId: 'trip2', hotelId: 'h3', hotelName: 'Snow Peak Manali', checkIn: '2026-07-15', checkOut: '2026-07-22', totalAmount: 29400, status: 'CONFIRMED', guestCount: 2, createdAt: '2026-05-15T10:00:00Z' },
];

export const MOCK_HOTEL_REVIEWS: HotelReview[] = [
  { id: 'rev1', hotelId: 'h1', hotelName: 'Grand Royale Goa', userId: 'u1', userName: 'Arjun Sharma', rating: 5, title: 'Amazing Stay!', comment: 'Exceptional service, stunning views, and fantastic food. Highly recommended!', createdAt: '2026-04-15T10:00:00Z' },
  { id: 'rev2', hotelId: 'h2', hotelName: 'Sunset Palms Resort', userId: 'u2', userName: 'Priya Nair', rating: 4, title: 'Great value for money', comment: 'Lovely property with a great pool. Food could be better but overall a nice stay.', createdAt: '2026-04-20T10:00:00Z' },
];

// ---------- TRANSPORT ----------

export const MOCK_TRANSPORTS: Transport[] = [
  { id: 'tr1', type: 'BUS', name: 'Mumbai-Goa Volvo Express', vehicleNumber: 'MH-12-AB-1234', route: 'Mumbai → Panaji', sourceCity: 'Mumbai', destinationCity: 'Goa', departureTime: '2026-08-10T21:00:00Z', arrivalTime: '2026-08-11T09:00:00Z', durationMinutes: 720, totalSeats: 45, availableSeats: 12, pricePerSeat: 850, amenities: ['AC', 'WiFi', 'Charging Points', 'Water Bottle'] },
  { id: 'tr2', type: 'FLIGHT', name: 'IndiGo 6E-402', vehicleNumber: '6E-402', route: 'Mumbai → Goa', sourceCity: 'Mumbai', destinationCity: 'Goa', departureTime: '2026-08-10T07:30:00Z', arrivalTime: '2026-08-10T08:45:00Z', durationMinutes: 75, totalSeats: 180, availableSeats: 34, pricePerSeat: 3200, amenities: ['In-flight Meal', 'Entertainment'] },
  { id: 'tr3', type: 'TRAIN', name: 'Konkan Kanya Express', vehicleNumber: '10003', route: 'Mumbai → Madgaon', sourceCity: 'Mumbai', destinationCity: 'Goa', departureTime: '2026-08-10T16:00:00Z', arrivalTime: '2026-08-11T04:00:00Z', durationMinutes: 720, totalSeats: 200, availableSeats: 28, pricePerSeat: 650, amenities: ['Sleeper AC', 'Pantry', 'Charging Points'] },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'v1', type: 'BUS', vehicleNumber: 'MH-12-AB-1234', capacity: 45, amenities: ['AC', 'WiFi', 'Charging'], status: 'ACTIVE', lastMaintenanceDate: '2026-06-01' },
  { id: 'v2', type: 'BUS', vehicleNumber: 'MH-12-CD-5678', capacity: 38, amenities: ['AC', 'WiFi'], status: 'MAINTENANCE', lastMaintenanceDate: '2026-07-01' },
  { id: 'v3', type: 'BUS', vehicleNumber: 'MH-12-EF-9012', capacity: 45, amenities: ['AC', 'WiFi', 'Charging', 'Entertainment'], status: 'ACTIVE', lastMaintenanceDate: '2026-05-15' },
];

export const MOCK_TRANSPORT_ROUTES: TransportRoute[] = [
  { id: 'rt1', sourceCity: 'Mumbai', destinationCity: 'Goa', distanceKm: 590, popularModes: ['BUS', 'FLIGHT', 'TRAIN'] },
  { id: 'rt2', sourceCity: 'Delhi', destinationCity: 'Manali', distanceKm: 525, popularModes: ['BUS', 'CAR'] },
  { id: 'rt3', sourceCity: 'Bangalore', destinationCity: 'Mysore', distanceKm: 150, popularModes: ['BUS', 'TRAIN', 'CAR'] },
];

export const MOCK_TRANSPORT_BOOKINGS: TransportBooking[] = [
  { id: 'tb1', tripId: 'trip1', transportId: 'tr1', transportName: 'Mumbai-Goa Volvo Express', transportType: 'BUS', route: 'Mumbai → Panaji', departureTime: '2026-08-10T21:00:00Z', arrivalTime: '2026-08-11T09:00:00Z', seatNumbers: ['5A', '5B', '6A', '6B', '7A'], passengerCount: 5, totalAmount: 4250, status: 'CONFIRMED', createdAt: '2026-06-25T12:00:00Z' },
];

// ---------- ACTIVITIES ----------

export const MOCK_ACTIVITIES: Activity[] = [
  { id: 'act1', name: 'Parasailing at Baga Beach', destinationId: 'd1', destinationName: 'Goa', description: 'Soar above the beautiful Goa coastline with a professional parasailing experience.', category: 'Adventure', difficulty: 'EASY', durationMinutes: 30, price: 1200, maxCapacity: 6, availableSlots: 4, timings: ['09:00', '10:30', '12:00', '14:30', '16:00'], imageUrl: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=400', travelerCategoryTags: ['FRIENDS', 'COUPLE'] },
  { id: 'act2', name: 'Scuba Diving – Grande Island', destinationId: 'd1', destinationName: 'Goa', description: 'Explore Goa\'s underwater world with certified instructors at Grande Island.', category: 'Water Sports', difficulty: 'MODERATE', durationMinutes: 180, price: 3500, maxCapacity: 8, availableSlots: 3, timings: ['08:00', '12:00'], imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400', travelerCategoryTags: ['FRIENDS', 'SOLO'] },
  { id: 'act3', name: 'Snow Trekking – Rohtang Pass', destinationId: 'd2', destinationName: 'Manali', description: 'Trek through breathtaking Himalayan landscapes with experienced guides.', category: 'Trekking', difficulty: 'HARD', durationMinutes: 480, price: 2800, maxCapacity: 12, availableSlots: 8, timings: ['05:30', '06:00'], imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400', travelerCategoryTags: ['SOLO', 'FRIENDS', 'COUPLE'] },
  { id: 'act4', name: 'Houseboat Cruise – Alleppey', destinationId: 'd4', destinationName: 'Kerala', description: 'Drift through Kerala\'s tranquil backwaters on a traditional kettuvallam houseboat.', category: 'Leisure', difficulty: 'EASY', durationMinutes: 480, price: 5500, maxCapacity: 10, availableSlots: 6, timings: ['09:00', '14:00'], imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400', travelerCategoryTags: ['COUPLE', 'FAMILY', 'SOLO'] },
];

export const MOCK_ATTRACTIONS: Attraction[] = [
  { id: 'attr1', name: 'Fort Aguada', destinationId: 'd1', destinationName: 'Goa', description: 'A 17th-century Portuguese fort with panoramic ocean views.', entryFee: 50, openingHours: '9am – 6pm', travelerCategoryTags: ['FRIENDS', 'COUPLE', 'SOLO'], rating: 4.4 },
  { id: 'attr2', name: 'Hadimba Devi Temple', destinationId: 'd2', destinationName: 'Manali', description: 'Serene cave temple nestled in the deodar cedar forest.', entryFee: 0, openingHours: '8am – 6pm', travelerCategoryTags: ['FAMILY', 'SOLO', 'COUPLE'], rating: 4.6 },
  { id: 'attr3', name: 'Amber Fort', destinationId: 'd3', destinationName: 'Rajasthan', description: 'Magnificent fortress palace with intricate Rajput architecture.', entryFee: 200, openingHours: '8am – 5:30pm', travelerCategoryTags: ['FAMILY', 'FRIENDS', 'COUPLE', 'SOLO'], rating: 4.8 },
];

export const MOCK_ACTIVITY_BOOKINGS: ActivityBooking[] = [
  { id: 'ab1', tripId: 'trip1', activityId: 'act1', activityName: 'Parasailing at Baga Beach', scheduledDate: '2026-08-12', scheduledTime: '10:30', participantCount: 3, totalAmount: 3600, status: 'CONFIRMED', createdAt: '2026-07-01T10:00:00Z' },
  { id: 'ab2', tripId: 'trip2', activityId: 'act3', activityName: 'Snow Trekking – Rohtang Pass', scheduledDate: '2026-07-18', scheduledTime: '05:30', participantCount: 2, totalAmount: 5600, status: 'CONFIRMED', createdAt: '2026-06-01T10:00:00Z' },
];

export const MOCK_CAPACITY_SLOTS: ActivityCapacitySlot[] = [
  { id: 'cs1', activityId: 'act1', activityName: 'Parasailing at Baga Beach', date: '2026-08-10', time: '09:00', totalSlots: 6, bookedSlots: 2, availableSlots: 4 },
  { id: 'cs2', activityId: 'act1', activityName: 'Parasailing at Baga Beach', date: '2026-08-10', time: '10:30', totalSlots: 6, bookedSlots: 6, availableSlots: 0 },
  { id: 'cs3', activityId: 'act1', activityName: 'Parasailing at Baga Beach', date: '2026-08-11', time: '09:00', totalSlots: 6, bookedSlots: 1, availableSlots: 5 },
];

// ---------- ITINERARY ----------

export const MOCK_ITINERARY: Itinerary = {
  id: 'iti1',
  tripId: 'trip1',
  title: 'Goa Beach Escape Itinerary',
  activities: [
    { id: 'ia1', itineraryId: 'iti1', activityName: 'Check-in at Grand Royale Goa', description: 'Hotel check-in and settle in', date: '2026-08-10', startTime: '14:00', endTime: '15:00', location: 'Grand Royale Goa, Baga Beach', completed: false },
    { id: 'ia2', itineraryId: 'iti1', activityId: 'act1', activityName: 'Parasailing at Baga Beach', date: '2026-08-12', startTime: '10:30', endTime: '11:00', location: 'Baga Beach', completed: false, cost: 3600 },
    { id: 'ia3', itineraryId: 'iti1', activityName: 'Dinner at Fisherman\'s Wharf', date: '2026-08-11', startTime: '19:30', endTime: '22:00', location: 'Fisherman\'s Wharf, Cavelossim', completed: false, cost: 3200 },
    { id: 'ia4', itineraryId: 'iti1', activityName: 'Fort Aguada Sunrise Visit', date: '2026-08-13', startTime: '06:00', endTime: '08:00', location: 'Fort Aguada, Sinquerim', completed: false },
  ],
  createdAt: '2026-06-25T10:00:00Z',
  updatedAt: '2026-07-01T10:00:00Z',
};

// ---------- DELAYS ----------

export const MOCK_DELAYS: Delay[] = [
  { id: 'del1', tripId: 'trip2', reportedAt: '2026-07-17T09:00:00Z', durationMinutes: 120, reason: 'WEATHER', notes: 'Heavy snowfall blocked Rohtang Pass road' },
];

export const MOCK_RESCHEDULE_SUGGESTIONS: RescheduleSuggestion[] = [
  { id: 'rs1', delayId: 'del1', activityId: 'act3', activityName: 'Snow Trekking – Rohtang Pass', newDate: '2026-07-19', newTime: '05:30', description: 'Move trek to Day 5 – weather forecast is clear.', confidence: 'HIGH' },
  { id: 'rs2', delayId: 'del1', activityId: 'act3', activityName: 'Snow Trekking – Rohtang Pass', newDate: '2026-07-20', newTime: '06:00', description: 'Move trek to Day 6 for extra buffer.', confidence: 'MEDIUM' },
];

// ---------- ADMIN ANALYTICS (MOCK) ----------

export const MOCK_ADMIN_STATS = {
  totalUsers: 1842,
  totalTrips: 456,
  activeTrips: 38,
  totalRevenue: 2847500,
  hotelBookings: 312,
  transportBookings: 189,
  activityBookings: 421,
  pendingApprovals: 7,
  recentGrowth: {
    users: 12.5,
    trips: 8.3,
    revenue: 15.2,
  },
};

export const MOCK_ADMIN_FUNNEL = [
  { stage: 'Visitors', count: 12500 },
  { stage: 'Registered', count: 1842 },
  { stage: 'Created Trip', count: 456 },
  { stage: 'Booked Hotel', count: 312 },
  { stage: 'Booked Transport', count: 189 },
  { stage: 'Completed Trip', count: 143 },
];
