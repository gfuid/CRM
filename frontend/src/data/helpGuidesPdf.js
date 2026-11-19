/**
 * Step-by-step PDF guides that ship with the CRM (files in /public/guides/).
 * Made from tools/help-videos/guides/*.html by tools/help-videos/make-guides.mjs (CRM screenshots + the steps
 * on the provider's own website). Re-make them when a screen or a provider's menu changes.
 */
export const HELP_GUIDES_PDF = [
  {
    id: 'guide-whatsapp', file: 'whatsapp-marketing-setup-guide.pdf', audience: 'owners', pages: 8,
    title: 'WhatsApp Marketing: full setup guide',
    description: 'Meta Business account, the WhatsApp number, app, permanent token, webhook, payment, templates, broadcasts, chats and auto replies.',
    keywords: ['whatsapp', 'meta', 'facebook', 'setup', 'token', 'webhook', 'template', 'broadcast', 'pdf', 'guide', 'aisensy'],
  },
  {
    id: 'guide-ai-calling', file: 'ai-calling-setup-guide.pdf', audience: 'owners', pages: 7,
    title: 'AI Calling: full setup guide',
    description: 'ElevenLabs account, agent and API key, buying a number on Vobiz (India) or Twilio / Telnyx, SIP trunk, script, test call and campaigns.',
    keywords: ['ai call', 'ai calling', 'elevenlabs', 'vobiz', 'twilio', 'telnyx', 'sip', 'agent', 'pdf', 'guide', 'international'],
  },
  {
    id: 'guide-email', file: 'email-marketing-setup-guide.pdf', audience: 'owners', pages: 3,
    title: 'Email Marketing: full setup guide',
    description: 'App password for Gmail / Outlook / Zoho, connecting the mailbox, daily limit, templates, tags, sending and open / click results.',
    keywords: ['email', 'gmail', 'outlook', 'zoho', 'app password', 'smtp', 'campaign', 'pdf', 'guide'],
  },
].map((g) => ({ ...g, url: `/guides/${g.file}` }));
