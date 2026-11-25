export function buildWhatsAppUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatPhone(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('94')) {
    const local = digits.slice(2);
    return `0${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`;
  }
  return number;
}

// Kept from the reference page: the public contact numbers for slip submissions.
export const SECONDARY_WHATSAPP_NUMBERS = ['94772976911', '94776994822'];
