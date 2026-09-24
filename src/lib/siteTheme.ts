// Drives the compliance micro-site's hero copy from the client's actual industry
// (Brand.vertical, set at brand submission) instead of one generic pitch for every
// client — e.g. a real estate wholesaler's site talks about deals and listings,
// not generic "account updates".

export type SiteTheme = {
  badge: string;
  headline: (businessName: string) => string;
  subtext: (businessName: string) => string;
  updateDescription: string;
};

const DEFAULT_THEME: SiteTheme = {
  badge: "SMS Updates",
  headline: (name) => `Stay in the loop with ${name}`,
  subtext: () =>
    "Get account updates and service notifications sent straight to your phone. Quick to join, easy to leave — you're always in control.",
  updateDescription: "Account updates and service notifications by text",
};

const THEMES: Record<string, SiteTheme> = {
  REAL_ESTATE: {
    badge: "Property Alerts",
    headline: (name) => `Never miss a deal with ${name}`,
    subtext: (name) =>
      `Get new listings, price updates, and off-market opportunities from ${name} sent straight to your phone.`,
    updateDescription: "New listings and deal alerts by text",
  },
  HEALTHCARE: {
    badge: "Care Updates",
    headline: (name) => `Stay on top of your care with ${name}`,
    subtext: (name) => `Get appointment reminders and care updates from ${name} sent straight to your phone.`,
    updateDescription: "Appointment reminders and care updates by text",
  },
  RETAIL: {
    badge: "Deals & Updates",
    headline: (name) => `Never miss a deal from ${name}`,
    subtext: (name) => `Get order updates, restocks, and promotions from ${name} sent straight to your phone.`,
    updateDescription: "Order updates and promotions by text",
  },
  HOSPITALITY: {
    badge: "Reservation Updates",
    headline: (name) => `Stay in the loop with ${name}`,
    subtext: (name) => `Get reservation confirmations and updates from ${name} sent straight to your phone.`,
    updateDescription: "Reservation and booking updates by text",
  },
  CONSTRUCTION: {
    badge: "Project Updates",
    headline: (name) => `Track your project with ${name}`,
    subtext: (name) => `Get job status updates and scheduling notices from ${name} sent straight to your phone.`,
    updateDescription: "Project status and scheduling updates by text",
  },
  PROFESSIONAL: {
    badge: "Account Updates",
    headline: (name) => `Stay informed with ${name}`,
    subtext: (name) => `Get appointment reminders and account updates from ${name} sent straight to your phone.`,
    updateDescription: DEFAULT_THEME.updateDescription,
  },
  TECHNOLOGY: {
    badge: "Product Updates",
    headline: (name) => `Stay up to date with ${name}`,
    subtext: (name) => `Get account notifications and product updates from ${name} sent straight to your phone.`,
    updateDescription: DEFAULT_THEME.updateDescription,
  },
  AGRICULTURE: {
    badge: "Season Updates",
    headline: (name) => `Stay ahead with ${name}`,
    subtext: (name) => `Get order and delivery updates from ${name} sent straight to your phone.`,
    updateDescription: DEFAULT_THEME.updateDescription,
  },
  INSURANCE: {
    badge: "Policy Updates",
    headline: (name) => `Stay covered with ${name}`,
    subtext: (name) => `Get policy reminders and claim updates from ${name} sent straight to your phone.`,
    updateDescription: "Policy reminders and claim updates by text",
  },
  EDUCATION: {
    badge: "School Updates",
    headline: (name) => `Stay informed with ${name}`,
    subtext: (name) => `Get schedule updates and announcements from ${name} sent straight to your phone.`,
    updateDescription: DEFAULT_THEME.updateDescription,
  },
  NGO: {
    badge: "Community Updates",
    headline: (name) => `Stay connected with ${name}`,
    subtext: (name) => `Get event updates and announcements from ${name} sent straight to your phone.`,
    updateDescription: DEFAULT_THEME.updateDescription,
  },
};

export function themeForVertical(vertical: string | null | undefined): SiteTheme {
  if (!vertical) return DEFAULT_THEME;
  return THEMES[vertical] ?? DEFAULT_THEME;
}
