/**
 * Phone number utility — detect mobile vs landline for LATAM countries.
 * Used to decide whether to show WhatsApp button.
 */

/**
 * Returns true if the phone number is likely a mobile number.
 * Landlines generally can't receive WhatsApp messages.
 *
 * Rules by country:
 * - Bolivia: mobile starts with 6, 7 (landline starts with 2, 3, 4)
 * - Peru: mobile starts with 9 (landline starts with 1-8 with area code)
 * - Argentina: mobile has 15 or starts with 9 after country code
 * - Colombia: mobile starts with 3 (landline starts with 1-8)
 * - Mexico: mobile 10 digits starting with area code (hard to distinguish)
 * - Chile: mobile starts with 9 (landline starts with 2)
 * - Paraguay: mobile starts with 9 (landline starts with 21)
 * - Uruguay: mobile starts with 09 (landline starts with 2)
 */
export function isMobileNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;

  // Clean the number — keep only digits and leading +
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // Get just digits
  const digits = cleaned.replace(/\D/g, "");

  if (digits.length < 7) return false;

  // Bolivia (+591)
  if (digits.startsWith("591")) {
    const local = digits.slice(3);
    return local.startsWith("6") || local.startsWith("7");
  }
  // Bolivia local format
  if (digits.length === 8 && (digits.startsWith("6") || digits.startsWith("7"))) {
    return true;
  }

  // Peru (+51)
  if (digits.startsWith("51")) {
    const local = digits.slice(2);
    return local.startsWith("9");
  }

  // Argentina (+54)
  if (digits.startsWith("54")) {
    const local = digits.slice(2);
    return local.startsWith("9") || local.includes("15");
  }

  // Colombia (+57)
  if (digits.startsWith("57")) {
    const local = digits.slice(2);
    return local.startsWith("3");
  }

  // Mexico (+52)
  if (digits.startsWith("52")) {
    // In Mexico, mobile and landline are hard to distinguish by prefix alone
    // Most businesses on Google Maps with phone have mobile, so default true
    return true;
  }

  // Chile (+56)
  if (digits.startsWith("56")) {
    const local = digits.slice(2);
    return local.startsWith("9");
  }

  // Paraguay (+595)
  if (digits.startsWith("595")) {
    const local = digits.slice(3);
    return local.startsWith("9");
  }

  // Uruguay (+598)
  if (digits.startsWith("598")) {
    const local = digits.slice(3);
    return local.startsWith("9");
  }

  // If we can't determine, check common mobile patterns
  // Numbers starting with 6, 7, 9 are often mobile in most countries
  const firstDigit = digits.charAt(0);
  if (["6", "7", "9"].includes(firstDigit) && digits.length <= 10) {
    return true;
  }

  // Default: assume it could be mobile (better to show button than miss opportunity)
  return digits.length >= 10;
}

/**
 * Format phone number for wa.me link.
 * Strips non-digits and ensures country code is present.
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // If already has country code (10+ digits), use as-is
  if (digits.length >= 10) return digits;

  // Bolivia 8-digit local number — add country code
  if (digits.length === 8 && (digits.startsWith("6") || digits.startsWith("7"))) {
    return `591${digits}`;
  }

  return digits;
}
