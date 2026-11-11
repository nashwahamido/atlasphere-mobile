# Atlasphere Mobile

The Atlasphere app for iPhone and Android, built with React Native and [Expo](https://expo.dev).
**Stop planning. Start going.** Atlasphere turns group chats into group trips.

It uses the same accounts, groups and data as the website ([AtlasphereWebApp-Updated](https://github.com/nashwahamido/AtlasphereWebApp-Updated)). The app talks to the website's server through its `/api/mobile` endpoints.

## What's in this version (0.4)

Everything the website has, on your phone, with the same account and data:

- **Account**: create an account (with the email code), log in, forgot password, stays signed in
- **Trips**: your trips, new trip (country → cities → days and interests), join with an invite link, trip photo, invite friends, rename, leave, delete
- **Chat**: live group chat, the same conversation as the website (shared places show as cards)
- **Recommendations**: swipe right to upvote, left to dismiss, up to save; filter by city; “closed on your dates” notes; share a place to the chat; see the group’s picks
- **Itinerary**: pick the trip dates, choose the city for each day, add activities (from the group’s picks or your own), move them, add notes; weather, holidays and closures for each day; changes show up live for everyone
- **Destination**: local time, weather, the forecast for each day (or typical weather), public holidays, closures and the crowd map, per city
- **Friends**: find people, requests, profiles
- **Profile**: photo, places you’ve been, notifications, Help/Privacy/Terms, log out, delete account

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
    (app)/             Signed-in screens: (tabs)/ Trips, Friends and Profile; trips/ new, join and
                       [id]/ (trip, chat, discover, itinerary, destination); notifications; profile/visited; people/[id]
  components/          Buttons, text fields, phone field, code input, …
  lib/
    api.ts             Calls to the Atlasphere server
    session.tsx        Who is signed in; restores and checks the login on launch
    friends.tsx        Your friends and requests, shared by every screen
    trips.tsx          Your trips, shared by the Trips tab and trip screens
    socket.ts          The live connection for chat and itinerary updates
    weather.ts         Weather and date helpers (same wording as the website)
    storage.ts         Secure storage for the login token
    validation.ts      Form rules (the same limits as the server)
assets/                App icon, Android adaptive icon, logo, welcome photo
tests/                 Unit tests
```

## Building for the App Store / Google Play

Store builds use [EAS Build](https://docs.expo.dev/build/introduction/). You'll need an Expo account plus an Apple Developer account (iOS) and/or a Google Play developer account (Android). The bundle identifier and package name are set to `app.atlasphere.mobile` in `app.json`; change them before the first store build if you want something else.
