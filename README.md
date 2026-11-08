# Atlasphere Mobile

The Atlasphere app for iPhone and Android, built with React Native and [Expo](https://expo.dev).
**Stop planning. Start going.** Atlasphere turns group chats into group trips.

It uses the same accounts, groups and data as the website ([AtlasphereWebApp-Updated](https://github.com/nashwahamido/AtlasphereWebApp-Updated)). The app talks to the website's server through its `/api/mobile` endpoints.

## What's in this version (0.3)

- Welcome screen
- **Create an account**: name, email, phone (with country code), optional gender, password (with links to the Terms of Service and Privacy Policy), then a 6-digit email code (paste and one-time-code autofill supported; it submits by itself once all six digits are in)
- **Log in**: an account that was never verified gets a fresh code instead
- **Forgot password**: emails the same reset link as the website
- Stays signed in between launches (the login token is kept in the phone's secure keychain/keystore)
- **Trips** tab: all your trips (most recently active first), pull down to refresh
- **New trip**: pick a country, one or more cities (the first is where you start), the number of days and your interests
- **Trip screen**: add or change the trip photo, share or copy the invite link, add your friends, change interests, rename, leave, or delete (organiser only)
- **Join a trip** by pasting an invite link, or by opening an `atlasphere://join/<code>` link
- **Profile** tab with your details and log out
- **Friends** tab (with a badge for new requests): find people by name or exact email as you type, accept or decline requests, see your friends and the requests you've sent; pull down to refresh
- **Profiles**: tap anyone to see their profile. Friends see each other's visited countries and cities, planned trips and trip count; everyone else sees name, photo and friend count, plus Add friend

Group chat, recommendations, the itinerary and the Destination tab come next (they're on the website for now).

## Try it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. On a computer with [Node.js](https://nodejs.org) 20 or newer:
   ```bash
   npm install
   npx expo start
   ```
3. Scan the QR code: with the Camera app on iPhone, or from inside Expo Go on Android.

The app connects to the live server at `https://atlasphere.up.railway.app` by default, so you can sign in with your existing Atlasphere account.

### Using a local server instead

Point the app at the website's server running on your computer (use your computer's network address, not `localhost`, so your phone can reach it):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npx expo start
```

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the development server |
| `npm run web` | Open the app in a browser |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Lint |
| `npm test` | Unit tests for the form rules |

## Project layout

```
src/
  app/                 Screens (Expo Router: every file is a screen)
    _layout.tsx        Shows the sign-in screens or the app, depending on login
    (auth)/            Welcome, log in, create account, verify code, forgot password
    (app)/             Signed-in screens: (tabs)/ Trips, Friends and Profile; trips/ new, join and [id]; people/[id]
  components/          Buttons, text fields, phone field, code input, …
  lib/
    api.ts             Calls to the Atlasphere server
    session.tsx        Who is signed in; restores and checks the login on launch
    friends.tsx        Your friends and requests, shared by every screen
    trips.tsx          Your trips, shared by the Trips tab and trip screens
    storage.ts         Secure storage for the login token
    validation.ts      Form rules (the same limits as the server)
assets/                App icon, Android adaptive icon, logo, welcome photo
tests/                 Unit tests
```

## Building for the App Store / Google Play

Store builds use [EAS Build](https://docs.expo.dev/build/introduction/). You'll need an Expo account plus an Apple Developer account (iOS) and/or a Google Play developer account (Android). The bundle identifier and package name are set to `app.atlasphere.mobile` in `app.json`; change them before the first store build if you want something else.
