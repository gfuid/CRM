/**
 * Travel-Trade CRM - Super Administrator Credentials & Access Keys
 * CONFIDENTIAL - For Authorized System Administrator Only
 * 
 * Production URLs:
 * - Admin Console: https://crm-b2g7.vercel.app/
 * - Sales CRM App: https://crm-amber-nine.vercel.app/
 * - Backend API:   https://crm-ep4i.onrender.com/api/v1
 */

module.exports = {
  admin: {
    title: 'Travel-Trade Super Administrator',
    username: 'traveltrade_admin',
    email: 'admin@travel-trade.com',
    password: 'TravelTrade#Admin2026!',
    accessLevel: 'SuperAdmin / System Owner',
    loginUrl: 'https://crm-b2g7.vercel.app/',
    permissions: [
      'Full User & Personnel Management',
      'Tenant & Organization Controls',
      'Subscription Tier Management',
      'System Health & Telemetry Metrics',
      'Audit Trail Logs'
    ]
  }
};
