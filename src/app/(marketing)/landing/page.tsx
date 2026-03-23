"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  MapPin,
  Search,
  Download,
  Globe,
  BarChart3,
  Map,
  FileSpreadsheet,
  Users,
  Radar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

function FadeInUp({ children, delay = 0, className = "" }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero map visual                                                    */
/* ------------------------------------------------------------------ */

function HeroMapVisual() {
  const pins = [
    { top: "22%", left: "30%", color: "bg-red-400", size: "h-3 w-3", delay: 0.4 },
    { top: "38%", left: "55%", color: "bg-blue-400", size: "h-3.5 w-3.5", delay: 0.6 },
    { top: "55%", left: "40%", color: "bg-amber-400", size: "h-3 w-3", delay: 0.5 },
    { top: "30%", left: "70%", color: "bg-red-400", size: "h-2.5 w-2.5", delay: 0.7 },
    { top: "65%", left: "60%", color: "bg-green-400", size: "h-3 w-3", delay: 0.8 },
    { top: "45%", left: "25%", color: "bg-red-400", size: "h-2.5 w-2.5", delay: 0.55 },
    { top: "20%", left: "50%", color: "bg-amber-400", size: "h-2.5 w-2.5", delay: 0.65 },
    { top: "70%", left: "35%", color: "bg-blue-400", size: "h-3 w-3", delay: 0.75 },
    { top: "50%", left: "72%", color: "bg-red-400", size: "h-3.5 w-3.5", delay: 0.9 },
    { top: "35%", left: "42%", color: "bg-green-400", size: "h-2.5 w-2.5", delay: 0.85 },
  ];

  return (
    <div className="relative w-full max-w-xl aspect-[4/3] rounded-2xl overflow-hidden glass">
      {/* Dark map background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
      {/* Grid lines to simulate map */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Road-like lines */}
      <div className="absolute inset-0">
        <div className="absolute top-[40%] left-0 right-0 h-px bg-slate-600/40" />
        <div className="absolute top-[60%] left-0 right-0 h-px bg-slate-600/30" />
        <div className="absolute top-0 bottom-0 left-[35%] w-px bg-slate-600/40" />
        <div className="absolute top-0 bottom-0 left-[65%] w-px bg-slate-600/30" />
        <div className="absolute top-[20%] left-[20%] right-[30%] h-px bg-slate-500/20 rotate-12" />
      </div>
      {/* Scanning pulse ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/30"
        initial={{ width: 0, height: 0, opacity: 0.8 }}
        animate={{ width: 300, height: 300, opacity: 0 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/20"
        initial={{ width: 0, height: 0, opacity: 0.6 }}
        animate={{ width: 300, height: 300, opacity: 0 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
      />
      {/* Pins */}
      {pins.map((pin, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: pin.top, left: pin.left }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: pin.delay, duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className={`${pin.size} ${pin.color} rounded-full shadow-lg shadow-current/30`} />
          <div className={`absolute inset-0 ${pin.color} rounded-full animate-ping opacity-30`} />
        </motion.div>
      ))}
      {/* Center scanner dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-4 w-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
      </div>
      {/* Corner label */}
      <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Radar className="h-3.5 w-3.5 text-blue-400" />
          <span>Scanning 247 businesses...</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeInUp>
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-slate-300">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span>B2B Lead Generation, Reinvented</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Find Businesses{" "}
                <span className="gradient-text">That Need You</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-lg">
                Scan any area on Google Maps. Detect businesses without websites,
                social media, or digital presence. Generate qualified leads in
                minutes.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/login">
                  <Button size="xl" className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25">
                    Start Scanning Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button
                    size="xl"
                    variant="outline"
                    className="border-white/20 text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    See How It Works
                  </Button>
                </Link>
              </div>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.2} className="flex justify-center lg:justify-end">
            <HeroMapVisual />
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: "50K+", label: "Businesses Scanned" },
    { value: "2,500+", label: "Leads Generated" },
    { value: "300+", label: "Agencies Trust Us" },
  ];

  return (
    <section className="border-y border-white/10 bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <FadeInUp>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: MapPin,
      title: "Pick a Zone",
      description:
        "Choose any city, neighborhood, or custom area on the interactive map. Draw a boundary or search by name.",
    },
    {
      icon: Search,
      title: "We Scan & Analyze",
      description:
        "Every business in the zone gets a full digital presence audit — website, social media, reviews, and more.",
    },
    {
      icon: Download,
      title: "Export & Outreach",
      description:
        "Download your qualified leads with opportunity scores, contact info, and actionable recommendations.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Three simple steps from map scan to qualified leads.
          </p>
        </FadeInUp>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <FadeInUp key={step.title} delay={i * 0.15}>
              <div className="relative text-center group">
                {/* Step number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-7xl font-black text-white/[0.03] select-none">
                  {i + 1}
                </div>
                {/* Icon */}
                <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl glass group-hover:bg-blue-500/10 transition-colors duration-300">
                  <step.icon className="h-7 w-7 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>

                {/* Connector line (between cards on desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-6 lg:-right-8 w-12 lg:w-16 h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Radar,
      title: "Bulk Zone Scanning",
      description:
        "Scan entire neighborhoods or cities at once. Our engine pulls every business in the area from Google Maps data.",
    },
    {
      icon: Globe,
      title: "Digital Presence Audit",
      description:
        "Detect missing websites, inactive social profiles, poor SEO, and outdated Google Business listings.",
    },
    {
      icon: BarChart3,
      title: "Opportunity Scoring",
      description:
        "Each business gets a score from 0-100 based on digital gaps. High scores mean high opportunity for your services.",
    },
    {
      icon: Map,
      title: "Interactive Map View",
      description:
        "Visualize results on a color-coded map. Filter by score, category, or digital gap type to find the best prospects.",
    },
    {
      icon: FileSpreadsheet,
      title: "Smart Export",
      description:
        "Export to CSV or XLSX with all data points. Include business name, address, phone, website status, and scores.",
    },
    {
      icon: Users,
      title: "Team & Agency Plans",
      description:
        "Collaborate with your team. Share scans, assign leads, and manage outreach campaigns from one dashboard.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white/[0.01]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Everything You Need to{" "}
            <span className="gradient-text">Find Clients</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Powerful tools to discover, qualify, and export business leads at scale.
          </p>
        </FadeInUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FadeInUp key={feature.title} delay={i * 0.1}>
              <div className="glass glass-hover rounded-2xl p-6 h-full">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <feature.icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="relative rounded-3xl glass overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Find Your Next Clients?
              </h2>
              <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
                Join hundreds of agencies and freelancers using MapKo to discover
                businesses that need their services.
              </p>
              <Link href="/login">
                <Button size="xl" className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25">
                  Start Scanning Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <StatsBar />
      <HowItWorksSection />
      <FeaturesSection />
      <CTASection />
    </>
  );
}
