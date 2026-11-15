# Publishing Atlasphere on Google Play

Everything in the code is ready: build profiles (`eas.json`), Android settings, push notifications, invite links that open the app, the account-deletion page, and store graphics (`store/`). These are the steps only you can do, in order.

**Costs:** Google Play developer account, $25 once. EAS builds are free on the free plan (with a queue).

---

## 1. Google Play developer account

1. Sign up at https://play.google.com/console ($25, ID check).
2. Choose **Personal** or **Organization**.
   - **Personal accounts created after November 2023 must run a closed test with at least 12 testers for 14 days in a row before they can publish to everyone.** Start finding 12 Android users (friends, classmates) now.
   - **Organization** accounts skip that, but need a D-U-N-S number for the business.

## 2. Firebase (push notifications on Android)

Android push goes through Google's Firebase. One-time setup:

1. https://console.firebase.google.com → **Add project** → name it `Atlasphere` (Analytics: off is fine).
2. **Add app → Android**, package name **`app.atlasphere.mobile`** → Register → **download `google-services.json`**.
3. Put `google-services.json` in the root of this folder (next to `app.json`) and commit it. It only holds public IDs, and `app.config.js` picks it up automatically.
4. In Firebase: **Project settings → Service accounts → Generate new private key**. This downloads a secret JSON file. **Don't commit it** (`.gitignore` already blocks the usual names).
5. Upload that secret key to Expo:
   ```bash
   eas credentials
   ```
   Choose **Android → production → Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1) → Set up → Upload a new service account key**, and pick the file.

## 3. Try it on an Android phone first (optional, recommended)

```bash
eas build -p android --profile preview
```
When it finishes (10–20 min), EAS shows a link and QR code. Open it on an Android phone to install the APK. This is the real app: navy launch screen, push notifications, everything.

## 4. Build the Play Store version

```bash
eas build -p android --profile production
```
- When asked to generate a new Android keystore, say **yes**. EAS keeps it safe, and you'll never need to handle it.
- This makes an **`.aab`** file. Download it from the link at the end, or from expo.dev → your project → Builds.
- The version code goes up automatically on each production build.

## 5. Create the app in Play Console

**Create app** → name `Atlasphere`, language English, **App**, **Free**, accept the declarations.

### Store listing (Grow → Store presence → Main store listing)

- **App name:** `Atlasphere: Group Trip Planner`
- **Short description (80 max):** `Plan trips with friends: vote on things to do, build the plan and chat together.`
- **Full description:**

  > Stop planning. Start going. Atlasphere turns group chats into group trips.
  >
  > Pick a country and the cities you want to see, invite your friends with one link, and plan the whole trip together:
  >
  > • Discover things to do in every city on your trip, and swipe to vote: upvote, save for later or skip. The group’s favourites rise to the top.
  > • Build the itinerary day by day. Choose your dates, decide which city you’re in each day and add the group’s picks. Everyone sees changes live.
  > • Know before you go: local time, the weather for each day of your trip, public holidays, places that are closed on your dates and a map of where it’s likely to be busy.
  > • Chat with everyone on the trip, and share places straight into the conversation.
  > • Add friends, see where they’ve been, and add them to trips.
  > • Notifications when friends join, vote or message, and dark mode.
  >
  > Works with the same account on the website, so everyone can join however they like.

- **App icon:** `store/graphics/icon-512.png`
- **Feature graphic:** `store/graphics/feature-graphic-1024x500.png`
- **Phone screenshots:** `store/screenshots/` (3 provided; 2 are required). Real screenshots from your own phone with real trips look better. Add 4–6 if you can: trips list, a trip, Discover, chat.
- **Category:** Travel & Local. **Contact email:** atlasphere.app@gmail.com.

### App content (Policy → App content)

| Section | Answer |
|---|---|
| Privacy policy | `https://atlasphere.up.railway.app/privacy` |
| App access | **All or some functionality is restricted** → give reviewers a test login (make an account for them, e.g. `review.atlasphere@…`, with a trip already set up) |
| Ads | No |
| Content rating | Fill in the questionnaire: category **Social/Communication**. Users can interact and exchange messages: **Yes**. Shares location: No. Digital purchases: No |
| Target audience | **18 and over** (keeps you out of the children’s-apps rules) |
| News app | No |
| Government app | No |
| Financial features | None |
| Health | No |
| Account deletion | Yes. URL: `https://atlasphere.up.railway.app/delete-account` |

### Data safety

- **Does your app collect or share user data?** Yes, it collects. **Shared with third parties:** No. (Hosting, email and push providers work on your behalf, which doesn’t count as sharing.)
- **Encrypted in transit:** Yes. **Users can ask for deletion:** Yes.
- **Data collected** (all: *collected, not shared, required unless noted, purpose = App functionality + Account management*):
  - Personal info: **Name**, **Email address**, **Phone number**, **Other info** (gender, optional)
  - Photos: **Photos** (profile and trip pictures, optional)
  - Messages: **Other in-app messages** (trip chat)
  - App activity: **Other user-generated content** (votes, itinerary, visited places)
  - Device or other IDs: **Device or other IDs** (push notification token, optional)
- Not collected: location, contacts, financial info, health, web history, analytics.

## 6. Release

1. **Testing → Internal testing → Create release** → upload the `.aab` → add your own email as a tester → roll out. The first upload has to be done by hand like this.
2. **Personal account:** move to **Closed testing**, add your 12+ testers, and keep it running 14 days. Then **Apply for production**.
3. **Production → Create release** → upload or promote the build → **Send for review**. The first review usually takes a few days.

## 7. Make invite links open the app

After the first upload:
1. Play Console → **Test and release → App integrity → App signing**: copy the **SHA-256** of the *App signing key certificate*.
2. Run `eas credentials -p android` → production and copy its **SHA-256 Fingerprint** (the upload key).
3. In **Railway → website service → Variables**, add:
   `ANDROID_CERT_SHA256` = `<first fingerprint>,<second fingerprint>`
4. Check `https://atlasphere.up.railway.app/.well-known/assetlinks.json` shows them. From then on, tapping an invite link on an Android phone with the app installed opens the app.

## Later updates

```bash
eas build -p android --profile production
eas submit -p android --latest      # optional, see below
```
To let `eas submit` upload for you: Play Console → **Setup → API access** → create a service account with release permissions → download its key as `play-service-account.json` into this folder (it’s git-ignored). Uploads then go to the internal track as drafts.

## Good to know

- **User-generated content rules.** Apps where people message each other may be asked to provide a way to **report** and **block** users, plus content rules in the Terms. Trip chats are only between people who invited each other, so you may not be asked. If the review raises it, that’s the next thing to build.
- **Splash screen.** The navy launch screen and the animation show fully in these builds, unlike in Expo Go.
