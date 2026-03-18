# Set up RevenueCat In-App Purchases properly

## What needs to happen

### Step 1 — You need to add 3 API keys (your action required)
Your RevenueCat project is connected, but the app needs 3 API keys set as environment variables in your Rork project settings:

1. **Test Store key** → `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` (for development/web preview)
2. **iOS App Store key** → `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (for production iOS)
3. **Android Play Store key** → `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (for production Android)

**How to find them:** Go to your [RevenueCat dashboard](https://app.revenuecat.com) → Your project → Apps → click each app → copy the "Public API Key" for each one. Then paste them into your Rork project's environment variable settings.

If you don't have all 3 apps created in RevenueCat yet, you'll need to create them there (Test Store is auto-created, but you may need to add App Store and Play Store apps).

---

### Step 2 — I'll rebuild the RevenueCat integration (code changes)

**Features:**
- Install the `react-native-purchases` SDK (the official RevenueCat package)
- Rewrite the RevenueCat provider to use the real SDK instead of raw API calls
- Automatically pick the right API key based on platform (Test for web/dev, iOS key for iPhone, Android key for Android)
- Fetch your subscription offering ($9.99/year with 3-day trial) from RevenueCat
- Handle purchasing, restoring purchases, and checking premium status
- Show errors gracefully if something goes wrong

**Paywall screen:**
- Clean, minimal design matching your app's dark theme
- Shows the subscription price ($9.99/year) and 3-day free trial info
- A single "Start Free Trial" button
- A "Restore Purchases" link below
- Appears as a modal when a user tries to access a locked feature

**Locked feature flow:**
- When a non-premium user taps a premium feature, the paywall modal slides up
- After successful purchase, the modal closes and the feature unlocks
- Premium status is checked and cached so it doesn't block the UI

**Restore purchases:**
- Available on the paywall screen
- Checks RevenueCat for any existing subscriptions tied to the user