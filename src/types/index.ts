// ─── Plan tiers ───────────────────────────────────────────────
export type PlanTier = "free" | "pro" | "agency";

export const PLAN_LIMITS: Record<PlanTier, { scansPerMonth: number; resultsPerScan: number }> = {
  free: { scansPerMonth: 1, resultsPerScan: 25 },
  pro: { scansPerMonth: -1, resultsPerScan: -1 }, // -1 = unlimited
  agency: { scansPerMonth: -1, resultsPerScan: -1 },
};

// ─── User profile ─────────────────────────────────────────────
export interface Profile {
  id: string;
  user_id: string;
  company_name: string | null;
  plan: PlanTier;
  scans_this_month: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Scan ─────────────────────────────────────────────────────
export type ScanStatus = "queued" | "scanning" | "analyzing" | "completed" | "failed";

export interface Scan {
  id: string;
  user_id: string;
  query_text: string;
  lat: number;
  lng: number;
  radius_km: number;
  categories: string[];
  status: ScanStatus;
  total_businesses: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Business ─────────────────────────────────────────────────
export interface Business {
  id: string;
  scan_id: string;
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  phone: string | null;
  website_url: string | null;
  rating: number | null;
  review_count: number;
  photo_count: number;
  business_status: string;
  google_data: Record<string, unknown>;
  created_at: string;
}

// ─── Analysis ─────────────────────────────────────────────────
export interface Analysis {
  id: string;
  business_id: string;
  has_website: boolean;
  website_ssl: boolean;
  website_responsive: boolean;
  website_load_time_ms: number | null;
  website_tech: string | null;
  has_social_media: boolean;
  social_links: Record<string, string>;
  review_response_rate: number;
  has_booking: boolean;
  has_whatsapp: boolean;
  profile_completeness: number;
  opportunity_score: number;
  recommendations: string[];
  analyzed_at: string;
}

// ─── Combined view for dashboard ──────────────────────────────
export interface BusinessWithAnalysis extends Business {
  analysis: Analysis | null;
}

// ─── Export ───────────────────────────────────────────────────
export type ExportFormat = "csv" | "xlsx";

export interface Export {
  id: string;
  user_id: string;
  scan_id: string;
  format: ExportFormat;
  file_url: string;
  created_at: string;
}

// ─── Google Places API types ──────────────────────────────────
export interface PlaceResult {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  types: string[];
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  photos?: { name: string; widthPx: number; heightPx: number }[];
  reviews?: PlaceReview[];
  businessStatus?: string;
  currentOpeningHours?: { openNow: boolean };
  reservable?: boolean;
  delivery?: boolean;
  dineIn?: boolean;
  googleMapsUri?: string;
}

export interface PlaceReview {
  name: string;
  rating: number;
  text?: { text: string };
  originalText?: { text: string };
  authorAttribution: { displayName: string };
  publishTime: string;
  relativePublishTimeDescription: string;
}

// ─── Google category mapping ──────────────────────────────────
export const BUSINESS_CATEGORIES: Record<string, string[]> = {
  "Restaurants": ["restaurant", "cafe", "bakery", "bar", "meal_delivery", "meal_takeaway"],
  "Health & Beauty": ["beauty_salon", "hair_care", "spa", "gym", "physiotherapist", "dentist"],
  "Medical": ["doctor", "hospital", "pharmacy", "veterinary_care", "health"],
  "Retail": ["store", "clothing_store", "shoe_store", "jewelry_store", "electronics_store", "furniture_store"],
  "Services": ["plumber", "electrician", "lawyer", "accounting", "insurance_agency", "real_estate_agency"],
  "Automotive": ["car_repair", "car_dealer", "car_wash", "gas_station"],
  "Education": ["school", "university", "library", "book_store"],
  "Lodging": ["lodging", "hotel", "motel"],
  "Entertainment": ["movie_theater", "night_club", "amusement_park", "bowling_alley"],
  "Other": [],
};

export const ALL_GOOGLE_TYPES = Object.values(BUSINESS_CATEGORIES).flat();
