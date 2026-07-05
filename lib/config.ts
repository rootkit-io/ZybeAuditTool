import { getEmailConfig as getEmailConfigFromEnv } from "@/lib/env";

export function getPublicAppConfig() {
  const bookingUrl = process.env.BOOKING_URL || "https://cal.com/";
  const contactEmail = process.env.CONTACT_EMAIL || "hello@zybesocial.com";
  const contactUrl = process.env.CONTACT_URL;

  return {
    bookingUrl,
    contactHref: contactUrl || `mailto:${contactEmail}?subject=Website%20audit%20follow-up`,
    contactLabel: contactUrl ? "Contact Zybe Social" : "Email Zybe Social"
  };
}

export const getEmailConfig = getEmailConfigFromEnv;
