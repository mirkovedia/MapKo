/**
 * Maps Google Places types to user-friendly category names.
 */

const TYPE_TO_CATEGORY: Record<string, string> = {
  restaurant: "Restaurants",
  cafe: "Restaurants",
  bakery: "Restaurants",
  bar: "Restaurants",
  meal_delivery: "Restaurants",
  meal_takeaway: "Restaurants",
  beauty_salon: "Health & Beauty",
  hair_care: "Health & Beauty",
  spa: "Health & Beauty",
  gym: "Health & Beauty",
  physiotherapist: "Health & Beauty",
  dentist: "Medical",
  doctor: "Medical",
  hospital: "Medical",
  pharmacy: "Medical",
  veterinary_care: "Medical",
  health: "Medical",
  store: "Retail",
  clothing_store: "Retail",
  shoe_store: "Retail",
  jewelry_store: "Retail",
  electronics_store: "Retail",
  furniture_store: "Retail",
  supermarket: "Retail",
  convenience_store: "Retail",
  plumber: "Services",
  electrician: "Services",
  lawyer: "Services",
  accounting: "Services",
  insurance_agency: "Services",
  real_estate_agency: "Services",
  car_repair: "Automotive",
  car_dealer: "Automotive",
  car_wash: "Automotive",
  gas_station: "Automotive",
  school: "Education",
  university: "Education",
  library: "Education",
  book_store: "Education",
  lodging: "Lodging",
  hotel: "Lodging",
  motel: "Lodging",
  movie_theater: "Entertainment",
  night_club: "Entertainment",
  amusement_park: "Entertainment",
  bowling_alley: "Entertainment",
};

export function mapGoogleTypeToCategory(types: string[]): string {
  for (const type of types) {
    if (TYPE_TO_CATEGORY[type]) {
      return TYPE_TO_CATEGORY[type];
    }
  }
  return "Other";
}

export function getGoogleTypesForCategory(category: string): string[] {
  return Object.entries(TYPE_TO_CATEGORY)
    .filter(([, cat]) => cat === category)
    .map(([type]) => type);
}
