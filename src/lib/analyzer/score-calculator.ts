/**
 * Opportunity Score Calculator (0–100)
 * Higher score = more opportunity = hotter lead.
 * Each factor adds points based on what the business is missing digitally.
 */

import type { WebsiteAnalysis } from "./website-checker";

interface ScoreInput {
  // From Google Places
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number;
  photoCount: number;
  hasBooking: boolean;
  businessStatus: string;

  // From review analysis
  reviewResponseRate: number; // 0.0 to 1.0
  lastReviewDate: string | null; // ISO date

  // From website analysis (null if no website)
  websiteAnalysis: WebsiteAnalysis | null;
}

interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdownItem[];
  recommendations: string[];
  profileCompleteness: number; // 0.0 to 1.0
}

interface ScoreBreakdownItem {
  factor: string;
  points: number;
  maxPoints: number;
  description: string;
}

export function calculateOpportunityScore(input: ScoreInput): ScoreResult {
  const breakdown: ScoreBreakdownItem[] = [];
  const recommendations: string[] = [];
  let score = 0;

  // ── No website at all (+30) ───────────────────────────────
  if (!input.websiteUrl) {
    score += 30;
    breakdown.push({
      factor: "no_website",
      points: 30,
      maxPoints: 30,
      description: "Business has no website",
    });
    recommendations.push(
      "This business has no website. Offer web design and development services."
    );
  } else if (input.websiteAnalysis) {
    const wa = input.websiteAnalysis;

    // Website exists but broken/no SSL (+15)
    if (!wa.isReachable || !wa.hasSSL) {
      const pts = !wa.isReachable ? 15 : 10;
      score += pts;
      breakdown.push({
        factor: "website_ssl",
        points: pts,
        maxPoints: 15,
        description: !wa.isReachable
          ? "Website is unreachable or broken"
          : "Website lacks SSL certificate (not secure)",
      });
      recommendations.push(
        !wa.isReachable
          ? "Their website is currently down or broken. Offer website repair/rebuild."
          : "Website is not using HTTPS. Offer SSL setup and security improvements."
      );
    }

    // Not responsive (+10)
    if (!wa.isResponsive) {
      score += 10;
      breakdown.push({
        factor: "not_responsive",
        points: 10,
        maxPoints: 10,
        description: "Website is not mobile-responsive",
      });
      recommendations.push(
        "Website is not optimized for mobile. Offer responsive redesign."
      );
    }

    // No social media links on website (+5)
    if (!wa.hasSocialLinks) {
      score += 5;
      breakdown.push({
        factor: "no_social_on_site",
        points: 5,
        maxPoints: 5,
        description: "Website has no social media links",
      });
    }

    // Outdated website (+5)
    if (wa.isOutdated) {
      score += 5;
      breakdown.push({
        factor: "outdated_site",
        points: 5,
        maxPoints: 5,
        description: `Website copyright is from ${wa.copyrightYear} — appears outdated`,
      });
      recommendations.push(
        "Website appears outdated. Offer a modern redesign."
      );
    }
  }

  // ── No social media presence (+15) ────────────────────────
  const hasSocial =
    input.websiteAnalysis?.hasSocialLinks || false;
  if (!hasSocial) {
    score += 15;
    breakdown.push({
      factor: "no_social_media",
      points: 15,
      maxPoints: 15,
      description: "No social media presence detected",
    });
    recommendations.push(
      "No social media profiles found. Offer social media setup and management."
    );
  }

  // ── Low review count (+10) ────────────────────────────────
  if (input.reviewCount < 10) {
    score += 10;
    breakdown.push({
      factor: "low_reviews",
      points: 10,
      maxPoints: 10,
      description: `Only ${input.reviewCount} Google reviews`,
    });
    recommendations.push(
      "Very few Google reviews. Offer review generation strategy."
    );
  }

  // ── Low rating (+5) ───────────────────────────────────────
  if (input.rating !== null && input.rating < 3.5) {
    score += 5;
    breakdown.push({
      factor: "low_rating",
      points: 5,
      maxPoints: 5,
      description: `Rating is ${input.rating}/5 — below average`,
    });
    recommendations.push(
      "Low Google rating. Offer reputation management services."
    );
  }

  // ── Owner doesn't respond to reviews (+10) ────────────────
  if (input.reviewResponseRate < 0.1) {
    score += 10;
    breakdown.push({
      factor: "no_review_responses",
      points: 10,
      maxPoints: 10,
      description: "Owner rarely or never responds to reviews",
    });
    recommendations.push(
      "Owner doesn't respond to reviews. Offer Google Business Profile management."
    );
  }

  // ── Few photos (+5) ───────────────────────────────────────
  if (input.photoCount < 5) {
    score += 5;
    breakdown.push({
      factor: "few_photos",
      points: 5,
      maxPoints: 5,
      description: `Only ${input.photoCount} photos on Google`,
    });
    recommendations.push(
      "Very few photos. Offer professional photography and content creation."
    );
  }

  // ── No online booking (+10) ───────────────────────────────
  if (!input.hasBooking) {
    score += 10;
    breakdown.push({
      factor: "no_booking",
      points: 10,
      maxPoints: 10,
      description: "No online booking/reservation system",
    });
    recommendations.push(
      "No online booking. Offer appointment scheduling setup."
    );
  }

  // ── Inactive — last review > 6 months old (+5) ────────────
  if (input.lastReviewDate) {
    const lastReview = new Date(input.lastReviewDate);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (lastReview < sixMonthsAgo) {
      score += 5;
      breakdown.push({
        factor: "inactive",
        points: 5,
        maxPoints: 5,
        description: "Last review is older than 6 months — appears inactive",
      });
    }
  }

  // Cap at 100
  score = Math.min(score, 100);

  // ── Profile completeness ──────────────────────────────────
  const completenessFactors = [
    !!input.websiteUrl,
    !!input.rating,
    input.reviewCount > 0,
    input.photoCount > 0,
    input.businessStatus === "OPERATIONAL",
    hasSocial,
    input.hasBooking,
    input.reviewResponseRate > 0.2,
  ];
  const profileCompleteness =
    completenessFactors.filter(Boolean).length / completenessFactors.length;

  return {
    score,
    breakdown,
    recommendations,
    profileCompleteness,
  };
}
