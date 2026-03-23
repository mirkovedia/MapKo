"use client";

import { useRef } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Animation helper                                                   */
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
/*  Plans data                                                         */
/* ------------------------------------------------------------------ */

interface Plan {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: 0,
    period: "/mo",
    description: "Try MapKo with basic scanning to see the value before you commit.",
    features: [
      "1 scan per month",
      "25 results per scan",
      "Basic export (CSV)",
      "Interactive map view",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 49,
    period: "/mo",
    description: "For freelancers and small agencies who need consistent lead flow.",
    features: [
      "Unlimited scans",
      "Unlimited results",
      "XLSX + CSV export",
      "Website quality analysis",
      "Saved scan history",
      "Opportunity scoring",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Agency",
    price: 99,
    period: "/mo",
    description: "Built for teams that sell digital services at scale.",
    features: [
      "Everything in Pro",
      "API access",
      "White-label reports",
      "Up to 10 team members",
      "Custom outreach templates",
      "Advanced analytics",
      "Dedicated support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Plan card                                                          */
/* ------------------------------------------------------------------ */

function PlanCard({ plan, delay }: { plan: Plan; delay: number }) {
  return (
    <FadeInUp delay={delay}>
      <div
        className={cn(
          "relative flex flex-col rounded-2xl p-8 h-full transition-all duration-300",
          plan.highlighted
            ? "glass border-blue-500/40 shadow-[0_0_40px_-12px_rgba(59,130,246,0.3)]"
            : "glass glass-hover"
        )}
      >
        {/* Popular badge */}
        {plan.highlighted && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <Badge className="bg-blue-500 text-white border-blue-400/50 shadow-lg shadow-blue-500/30 px-4 py-1">
              <Sparkles className="h-3 w-3 mr-1.5" />
              Most Popular
            </Badge>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="mb-8">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-white">
              ${plan.price}
            </span>
            <span className="text-slate-400 text-lg">{plan.period}</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <span className="text-sm text-slate-300">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link href="/login">
          <Button
            size="lg"
            className={cn(
              "w-full",
              plan.highlighted
                ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
            )}
          >
            {plan.cta}
          </Button>
        </Link>
      </div>
    </FadeInUp>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  return (
    <section className="py-20 sm:py-28">
      {/* Background glow */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <FadeInUp className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Simple, Transparent{" "}
            <span className="gradient-text">Pricing</span>
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Start free, upgrade when you need more power. No hidden fees, cancel anytime.
          </p>
        </FadeInUp>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} delay={i * 0.15} />
          ))}
        </div>

        {/* Bottom note */}
        <FadeInUp delay={0.5} className="text-center mt-12">
          <p className="text-sm text-slate-500">
            All paid plans include a 14-day free trial. No credit card required.
          </p>
        </FadeInUp>
      </div>
    </section>
  );
}
