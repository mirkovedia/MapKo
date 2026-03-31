"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Share2,
  Star,
  MapPin,
  ExternalLink,
  Check,
  X,
  Clock,
  Code,
  BarChart3,
  Lightbulb,
  MessageCircle,
  Mail,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  StickyNote,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn, getScoreColor, getScoreLabel } from "@/lib/utils";
import { isMobileNumber, formatPhoneForWhatsApp } from "@/lib/utils/phone-helper";
import type { BusinessWithAnalysis, LeadStatus } from "@/types";

// ── Lead status config ──────────────────────────────────────────
const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; border: string }> = {
  new: { label: "New", color: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-400/20" },
  contacted: { label: "Contacted", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  interested: { label: "Interested", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  proposal: { label: "Proposal", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  closed: { label: "Closed", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
  not_interested: { label: "Not Interested", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
};

const LEAD_STATUSES = Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[];

function BoolIndicator({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          value ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
        )}
      >
        {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function PercentBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="p-3 rounded-lg bg-white/5">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [business, setBusiness] = useState<BusinessWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  // CRM state
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    if (statusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [statusDropdownOpen]);

  // Sync notes state when business loads
  useEffect(() => {
    if (business) {
      setNotes(business.notes || "");
    }
  }, [business]);

  // CRM update handler
  const updateCrmField = useCallback(async (data: { lead_status?: LeadStatus; notes?: string; last_contacted_at?: string }) => {
    if (!business) return;
    try {
      const res = await fetch(`/api/businesses/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      const result = await res.json();
      setBusiness((prev) => prev ? { ...prev, ...result.business } : prev);
    } catch {
      setError("Failed to update CRM data");
    }
  }, [business, id]);

  async function handleStatusChange(newStatus: LeadStatus) {
    setStatusDropdownOpen(false);
    setUpdatingStatus(true);
    await updateCrmField({
      lead_status: newStatus,
      last_contacted_at: new Date().toISOString(),
    });
    setUpdatingStatus(false);
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    // Debounce auto-save
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(async () => {
      setSavingNotes(true);
      await updateCrmField({ notes: value });
      setSavingNotes(false);
    }, 1000);
  }

  function handleNotesBlur() {
    // Save immediately on blur if there's a pending timeout
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
      notesTimeoutRef.current = null;
    }
    if (business && notes !== (business.notes || "")) {
      setSavingNotes(true);
      updateCrmField({ notes }).then(() => setSavingNotes(false));
    }
  }

  async function handleDownloadPdf() {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      const res = await fetch(`/api/businesses/${id}/report`);
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "mapko-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "Failed to download PDF report"
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/businesses/${id}`);
        if (!res.ok) throw new Error("Failed to fetch business");
        const data = await res.json();
        setBusiness(data.business);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive">{error || "Business not found"}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const analysis = business.analysis;
  const score = analysis?.opportunity_score ?? 0;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const socialLinks = analysis?.social_links ?? {};
  const socialEntries = Object.entries(socialLinks);
  const ringColorClass =
    scoreColor === "high"
      ? "text-red-400"
      : scoreColor === "medium"
      ? "text-amber-400"
      : "text-green-400";
  const ringBgClass =
    scoreColor === "high"
      ? "stroke-red-400"
      : scoreColor === "medium"
      ? "stroke-amber-400"
      : "stroke-green-400";

  // Calculate the circumference and offset for the score ring
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 max-w-4xl"
    >
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Scan
      </button>

      {/* Business header */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{business.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="text-sm">{business.address}</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="secondary">{business.category}</Badge>
                {business.rating !== null && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span className="font-medium">{business.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      ({business.review_count} reviews)
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${business.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4" />
                    Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
                {business.website_url && (
                  <a href={business.website_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
                {business.phone && isMobileNumber(business.phone) && (
                  <a
                    href={`https://wa.me/${formatPhoneForWhatsApp(business.phone)}?text=${encodeURIComponent("Hola! Encontré su negocio en Google Maps y me gustaría ofrecerle servicios digitales para mejorar su presencia online. ¿Podemos hablar?")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="sm"
                      className="bg-[#25D366] hover:bg-[#1da851] text-white border-0"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </a>
                )}
                {business.phone && !isMobileNumber(business.phone) && (
                  <a href={`tel:${business.phone.replace(/[\s\-()]/g, "")}`}>
                    <Button size="sm" variant="outline">
                      <Globe className="h-4 w-4" />
                      Llamar ({business.phone})
                    </Button>
                  </a>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloadingPdf ? "Generating..." : "Download PDF Report"}
                </Button>
                {pdfError && (
                  <p className="text-red-400 text-xs mt-1">{pdfError}</p>
                )}
              </div>
            </div>

            {/* Score indicator */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    className="stroke-white/10"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    className={ringBgClass}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-3xl font-bold", ringColorClass)}>{score}</span>
                </div>
              </div>
              <p className={cn("text-sm font-semibold mt-1", ringColorClass)}>
                {scoreLabel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CRM Section */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-purple-400" />
            Lead Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Status selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Lead Status
              </label>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  disabled={updatingStatus}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold border cursor-pointer transition-all hover:opacity-80",
                    LEAD_STATUS_CONFIG[(business.lead_status || "new") as LeadStatus].bg,
                    LEAD_STATUS_CONFIG[(business.lead_status || "new") as LeadStatus].color,
                    LEAD_STATUS_CONFIG[(business.lead_status || "new") as LeadStatus].border
                  )}
                >
                  {updatingStatus ? (
                    <Spinner size="sm" />
                  ) : (
                    LEAD_STATUS_CONFIG[(business.lead_status || "new") as LeadStatus].label
                  )}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-full rounded-lg border border-border bg-card shadow-xl py-1">
                    {LEAD_STATUSES.map((s) => {
                      const cfg = LEAD_STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors flex items-center gap-2",
                            (business.lead_status || "new") === s && "bg-accent/30"
                          )}
                        >
                          <span className={cn("h-2.5 w-2.5 rounded-full", cfg.bg, cfg.border, "border")} />
                          <span className={cfg.color}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Last contacted */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Last Contacted
              </label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-border/40 h-[38px]">
                <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {business.last_contacted_at
                    ? new Date(business.last_contacted_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Never"}
                </span>
              </div>
            </div>

            {/* Notes saving indicator */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Status
              </label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-border/40 h-[38px]">
                {savingNotes ? (
                  <>
                    <Spinner size="sm" />
                    <span className="text-sm text-muted-foreground">Saving notes...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">Notes saved</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes textarea */}
          <div className="mt-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes about this lead..."
              className="w-full rounded-lg border border-border/40 bg-white/5 px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-ring transition-colors placeholder:text-muted-foreground/50"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Digital Presence Audit */}
      {analysis && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Digital Presence Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BoolIndicator value={analysis.has_website} label="Website" />
              <BoolIndicator value={analysis.website_ssl} label="SSL Certificate" />
              <BoolIndicator value={analysis.website_responsive} label="Mobile Friendly" />
              <BoolIndicator value={analysis.has_booking} label="Online Booking" />
              <BoolIndicator value={analysis.has_whatsapp} label="WhatsApp" />
              <BoolIndicator value={analysis.has_social_media} label="Social Media Presence" />

              {/* Website URL */}
              {analysis.has_website && business.website_url && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 col-span-full">
                  <div className="h-8 w-8 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Website URL</p>
                    <a
                      href={business.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block"
                    >
                      {business.website_url}
                    </a>
                  </div>
                </div>
              )}

              {/* Social media links */}
              {socialEntries.length > 0 && (
                <div className="p-3 rounded-lg bg-white/5 col-span-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">Social Media Links</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {socialEntries.map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-md px-2.5 py-1.5 transition-colors"
                      >
                        {platform}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Percentages */}
              <PercentBar
                value={analysis.review_response_rate}
                label="Review Response Rate"
              />
              <PercentBar
                value={analysis.profile_completeness}
                label="Profile Completeness"
              />

              {/* Website Technology */}
              {analysis.website_tech && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-purple-400/10 text-purple-400 flex items-center justify-center shrink-0">
                    <Code className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website Technology</p>
                    <p className="text-sm font-medium">{analysis.website_tech}</p>
                  </div>
                </div>
              )}

              {/* Load Time */}
              {analysis.website_load_time_ms !== null && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Load Time</p>
                    <p className="text-sm font-medium">{analysis.website_load_time_ms}ms</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis && analysis.recommendations.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.recommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/5"
                >
                  <div className="h-6 w-6 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm">{rec}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outreach Templates */}
      {analysis && (
        <OutreachTemplates
          businessName={business.name}
          category={business.category}
          hasWebsite={analysis.has_website}
          hasSocialMedia={analysis.has_social_media}
        />
      )}

      {/* Back button */}
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Back to Scan
      </Button>
    </motion.div>
  );
}

// ── Outreach Templates ───────────────────────────────────────────

interface TemplateData {
  id: string;
  title: string;
  subject: string;
  body: string;
}

function OutreachTemplates({
  businessName,
  category,
  hasWebsite,
  hasSocialMedia,
}: {
  businessName: string;
  category: string;
  hasWebsite: boolean;
  hasSocialMedia: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const templates: TemplateData[] = [];

  if (!hasWebsite) {
    templates.push({
      id: "no-website",
      title: "No Website",
      subject: `${businessName} - Let's build your online presence`,
      body: `Hi,

I came across ${businessName} while researching ${category} businesses in your area, and I noticed you don't currently have a website.

In today's digital landscape, having a professional website is essential for attracting new customers and building trust. A well-designed website can help ${businessName}:

- Appear in Google search results when potential customers look for ${category} services
- Showcase your products, services, and customer reviews
- Allow customers to find your hours, location, and contact information easily
- Stand out from competitors who already have an online presence

I specialize in helping ${category} businesses like yours establish a strong digital presence. I'd love to discuss how we can create a website that drives real results for ${businessName}.

Would you be available for a quick 15-minute call this week?

Best regards`,
    });
  }

  templates.push({
    id: "improve-presence",
    title: "Improve Online Presence",
    subject: `Boost ${businessName}'s online visibility and attract more customers`,
    body: `Hi,

I recently found ${businessName} on Google Maps and took a closer look at your current online presence. I see a great opportunity to improve your digital footprint and attract more customers.

Here are a few areas where ${businessName} could benefit from some enhancements:

- Optimizing your Google Business Profile for better local search rankings
- Improving your online review strategy to build social proof
- Ensuring your business information is consistent across all platforms
- Implementing SEO best practices specific to the ${category} industry

I work with ${category} businesses to help them grow their customer base through strategic digital improvements. Many of my clients see measurable results within the first few months.

I'd love to share some specific insights I've gathered about ${businessName}'s online presence. Would you be open to a brief conversation?

Best regards`,
  });

  if (!hasSocialMedia) {
    templates.push({
      id: "social-media",
      title: "Social Media",
      subject: `${businessName} - Reach more customers through social media`,
      body: `Hi,

I was looking into ${businessName} and noticed you don't currently have an active social media presence. In the ${category} industry, social media has become one of the most effective ways to connect with customers and grow your business.

Here's what a solid social media strategy could do for ${businessName}:

- Increase brand awareness in your local area
- Engage directly with current and potential customers
- Showcase your work, products, and happy customers
- Drive more foot traffic and online inquiries
- Build a loyal community around your brand

I help ${category} businesses create and manage social media strategies that deliver real, measurable results — without taking up your valuable time.

Would you be interested in a quick chat about how social media could benefit ${businessName}?

Best regards`,
    });
  }

  if (templates.length === 0) return null;

  async function handleCopy(template: TemplateData) {
    const fullText = `Subject: ${template.subject}\n\n${template.body}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(template.id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-400" />
          Outreach Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {templates.map((template) => {
            const isExpanded = expanded === template.id;
            return (
              <div
                key={template.id}
                className="rounded-lg border border-white/10 bg-white/5 overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : template.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{template.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.subject}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-white/10"
                  >
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Subject
                        </p>
                        <p className="text-sm bg-white/5 rounded-md px-3 py-2">
                          {template.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Body
                        </p>
                        <pre className="text-sm bg-white/5 rounded-md px-3 py-2 whitespace-pre-wrap font-sans">
                          {template.body}
                        </pre>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(template)}
                        className="w-full sm:w-auto"
                      >
                        {copied === template.id ? (
                          <>
                            <Check className="h-4 w-4 text-green-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy to Clipboard
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
