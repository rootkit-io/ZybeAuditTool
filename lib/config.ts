import { getEmailConfig as getEmailConfigFromEnv } from "@/lib/env";

export function getPublicAppConfig() {
  const bookingUrl = process.env.BOOKING_URL || "https://cal.com/";
  const contactEmail = process.env.CONTACT_EMAIL || "hello@zybesocial.com";
  const contactUrl = process.env.CONTACT_URL;
  const phonePrimary = process.env.CONTACT_PHONE_PRIMARY || "+34 657 21 33 37";
  const phoneSecondary = process.env.CONTACT_PHONE_SECONDARY || "+91 92587 32032";

  return {
    bookingUrl,
    contactHref: contactUrl || `mailto:${contactEmail}?subject=Website%20audit%20follow-up`,
    contactLabel: contactUrl ? "Contact Zybe Social" : "Email Zybe Social",
    phonePrimary,
    phoneSecondary
  };
}

export const getEmailConfig = getEmailConfigFromEnv;
