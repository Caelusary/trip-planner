// Fake data for the e2e mock Supabase server. Nothing here is a real
// account: the user, token and password exist only inside the mock.

const DAY = 86_400_000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

export const FIXTURE_USER = {
  password: "e2e-test-password",
  accessToken: "e2e-access-token",
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "traveller@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  },
};

export const KYOTO_ID = "11111111-1111-4111-8111-111111111111";
export const LISBON_ID = "22222222-2222-4222-8222-222222222222";
export const SHARE_TOKEN = "33333333-3333-4333-8333-333333333333";

export function freshDb() {
  const userId = FIXTURE_USER.user.id;
  return {
    trips: [
      {
        id: KYOTO_ID,
        user_id: userId,
        name: "Spring in Kyoto",
        destination_city: "Kyoto, JP",
        destination_lat: null,
        destination_lon: null,
        start_date: iso(20),
        end_date: iso(27),
        created_at: "2026-09-01T00:00:00Z",
        share_token: SHARE_TOKEN,
        share_enabled: true,
      },
      {
        id: LISBON_ID,
        user_id: userId,
        name: "Lisbon long weekend",
        destination_city: "Lisbon, PT",
        destination_lat: null,
        destination_lon: null,
        start_date: iso(-60),
        end_date: iso(-56),
        created_at: "2026-06-01T00:00:00Z",
        share_token: "44444444-4444-4444-8444-444444444444",
        share_enabled: false,
      },
    ],
    trip_stops: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        trip_id: KYOTO_ID,
        city: "Osaka",
        lat: null,
        lon: null,
        arrival_date: iso(20),
        departure_date: iso(21),
        notes: "Land at KIX, train into Kyoto",
        position: 0,
        created_at: "2026-09-01T00:00:00Z",
        stop_type: "flight",
        confirmation_number: "JL7XQ2",
      },
    ],
    packing_items: [
      {
        id: "66666666-6666-4666-8666-666666666666",
        trip_id: KYOTO_ID,
        label: "Passport",
        checked: true,
        position: 0,
        created_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "77777777-7777-4777-8777-777777777777",
        trip_id: KYOTO_ID,
        label: "Rail pass voucher",
        checked: false,
        position: 1,
        created_at: "2026-09-01T00:00:00Z",
      },
    ],
  };
}
