export type CafeReviewSummary = {
  averageRating: number;
  reviewCount: number;
};

export type CafeReview = {
  id: string;
  rating: number;
  note: string;
  drink: string | null;
  tags: string[];
  createdAt: string;
};

export type CafeTrustSignals = {
  topTags: string[];
  recentReviews: CafeReview[];
};

export type CafeTrustPreview = {
  topMentions: string[];
  recentQuote: string | null;
};

export type Cafe = {
  id: string;
  slug: string;
  name: string;
  city: string;
  countryCode: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  roasters: string[];
  drinks: string[];
  tags: string[];
  photo: string | null;
  summary: string;
  reviewSummary: CafeReviewSummary;
  trustPreview: CafeTrustPreview;
};

export type CityHighlight = {
  slug: string;
  name: string;
  countryCode: string;
  cafeCount: number;
  topRatedCafe: string | null;
};

export type MapCafe = Pick<
  Cafe,
  "id" | "slug" | "name" | "city" | "countryCode" | "latitude" | "longitude" | "tags" | "reviewSummary"
>;

export type FallbackPlace = {
  id: string;
  source: "osm-overpass";
  name: string;
  address: string;
  city: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  website: string | null;
};
