# RevenueCat In-App Purchases - Setup Complete

## Completed

- [x] Installed `react-native-purchases` SDK
- [x] Rewrote `providers/RevenueCatProvider.tsx` with real SDK (was using raw API calls)
- [x] Auto-selects API key per platform (iOS key for iPhone, Android key for Android, falls back to iOS key for web/dev)
- [x] Fetches subscription offering from RevenueCat on init
- [x] Handles purchasing, restoring, and premium status checking
- [x] Created `app/paywall.tsx` — dark-themed modal paywall with $9.99/year + 3-day trial
- [x] Registered paywall as modal route in `app/_layout.tsx`
- [x] Updated `app/welcome.tsx` — "Start Free Trial" opens paywall modal
- [x] Created Android product (`athliai_unlimited:annual`) in RevenueCat
- [x] Attached both iOS and Android products to "AthliAI Premium" entitlement
- [x] Attached both products to the default offering package

## RevenueCat Dashboard Config

- **Entitlement:** `AthliAI Premium`
- **Offering:** `default` (current)
- **Package:** `$rc_annual`
- **iOS Product:** `Oliver20011` (subscription)
- **Android Product:** `athliai_unlimited:annual` (subscription)

## Environment Variables

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` — configured
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` — configured
- `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` — not set (no Stripe linked to RC project; iOS key used as fallback)

## How to open the paywall

- From welcome flow: "Start Free Trial" button navigates to `/paywall`
- From anywhere in the app: `router.push('/paywall')`
- Check premium status: `const { isPremium } = useRevenueCat()`
