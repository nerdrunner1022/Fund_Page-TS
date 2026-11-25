import type { Lang } from '../types';

export interface UiStrings {
  skipToContent: string;
  languageToggleLabel: string;
  themeToggleLabel: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  loading: string;
  loadError: string;
  retry: string;
  errorSummaryTitle: string;
  amountRequired: string;
  amountInvalid: string;
  amountOutOfRange: string;
  nameTooLong: string;
  recording: string;
  recorded: string;
  recordFailed: string;
  referenceLabel: string;
  bankAccountLabel: string;
  accountNumberLabel: string;
  bankLabel: string;
  branchLabel: string;
  whatsappLabel: string;
  progressLabel: string;
  verifiedDonors: string;
}

export const UI: Record<Lang, UiStrings> = {
  en: {
    skipToContent: 'Skip to main content',
    languageToggleLabel: 'Change language',
    themeToggleLabel: 'Change colour theme',
    themeSystem: 'System theme',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    loading: 'Loading the campaign…',
    loadError: 'We could not load the campaign. Please check your connection.',
    retry: 'Try again',
    errorSummaryTitle: 'There is a problem',
    amountRequired: 'Enter an amount to send with your slip.',
    amountInvalid: 'Enter the amount in rupees, for example 5000 or 2500.50.',
    amountOutOfRange: 'Enter an amount from Rs. 1 to Rs. 10,000,000.',
    nameTooLong: 'Keep your name under 120 characters.',
    recording: 'Saving your declaration…',
    recorded: 'Declaration saved. Your reference is {ref}.',
    recordFailed: 'We could not save your declaration, but you can still send the slip.',
    referenceLabel: 'Reference',
    bankAccountLabel: 'Account',
    accountNumberLabel: 'Account number',
    bankLabel: 'Bank',
    branchLabel: 'Branch',
    whatsappLabel: 'Other WhatsApp contacts',
    progressLabel: 'Fundraising progress',
    verifiedDonors: 'Verified donors: {n}',
  },
  ta: {
    skipToContent: 'முதன்மை உள்ளடக்கத்திற்குச் செல்லுங்கள்',
    languageToggleLabel: 'மொழியை மாற்றுங்கள்',
    themeToggleLabel: 'வண்ணத் தீமை மாற்றுங்கள்',
    themeSystem: 'கணினி தீம்',
    themeLight: 'வெளிச்ச தீம்',
    themeDark: 'இருண்ட தீம்',
    loading: 'நிதி தகவல்கள் ஏற்றப்படுகின்றன…',
    loadError: 'நிதி தகவலை ஏற்ற முடியவில்லை. இணைப்பைச் சரிபார்க்கவும்.',
    retry: 'மீண்டும் முயற்சிக்கவும்',
    errorSummaryTitle: 'சிக்கல் உள்ளது',
    amountRequired: 'பற்றுச்சீட்டுடன் அனுப்பும் தொகையை உள்ளிடவும்.',
    amountInvalid: 'ரூபாயில் தொகையை உள்ளிடவும், எடுத்துக்காட்டு 5000 அல்லது 2500.50.',
    amountOutOfRange: 'ரூ. 1 முதல் ரூ. 1 கோடி வரை தொகையை உள்ளிடவும்.',
    nameTooLong: 'உங்கள் பெயரை 120 எழுத்துகளுக்குள் வைக்கவும்.',
    recording: 'உங்கள் அறிவிப்பு சேமிக்கப்படுகிறது…',
    recorded: 'அறிவிப்பு சேமிக்கப்பட்டது. உங்கள் குறியீடு {ref}.',
    recordFailed: 'அறிவிப்பை சேமிக்க முடியவில்லை, ஆனால் பற்றுச்சீட்டை அனுப்பலாம்.',
    referenceLabel: 'குறியீடு',
    bankAccountLabel: 'கணக்கு',
    accountNumberLabel: 'கணக்கு எண்',
    bankLabel: 'வங்கி',
    branchLabel: 'கிளை',
    whatsappLabel: 'மற்ற WhatsApp தொடர்புகள்',
    progressLabel: 'நிதி முன்னேற்றம்',
    verifiedDonors: 'சரிபார்க்கப்பட்ட நன்கொடையாளர்கள்: {n}',
  },
};
