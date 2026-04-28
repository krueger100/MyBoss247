# Boss Mode

**You're the employee. The app is your boss.**

An accountability app for solo entrepreneurs who struggle with self-discipline. The app takes the role of a strict boss — assigning tasks, checking in 4× a day, escalating warnings, and triggering real financial penalties via Stripe when you miss deadlines.

## What makes it different

- **Real money on the line** — penalties are auto-charged to charity or an accountability partner
- **Opportunity Cost Clock** — see your wasted hours tick up as dollars based on your business's earning potential
- **3 Boss personalities** — Drill Sergeant, Tough Coach, or Supportive Manager
- **AI Boss Chat** — GPT-4o stays in character and references your real task data
- **Head-to-head challenges** — compete with partners for cash; VIP $5K+ duels with human verifiers

## Stack

- **Frontend:** React Native + Expo (SDK 54), Expo Router, Tamagui
- **Backend:** Convex (database, queries, mutations, actions)
- **Auth:** Clerk (with Convex JWT integration)
- **Payments:** Stripe + Stripe Connect (planned)
- **AI:** OpenAI GPT-4o (planned)

## Status

| Feature | Status |
|---|---|
| Sign up / Sign in / Forgot password | ✅ |
| Convex user sync + onboarding routing | ✅ |
| Quick Start onboarding | ✅ |
| 5-tab navigation shell | ✅ |
| Dashboard wired to live Convex data | ✅ |
| Task CRUD + Opportunity Cost Clock | ✅ |
| Project CRUD | ✅ (UI list pending real wiring) |
| AI Boss Chat | ⏳ |
| Stripe penalty charges | ⏳ |
| Push notifications + check-in cron | ⏳ |
| Accountability partners + challenges | ⏳ |
| VIP High Stakes ($5K+ duels) | ⏳ |

See `boss_mode_PDR.md` for the full product spec and `boss_mode_wireframes.md` for screen flows.

## Running locally

```bash
cd app/MyBoss247
npm install --legacy-peer-deps
npx convex dev   # in one terminal
npx expo start --android   # in another
```

You'll need:
- A Clerk app with the `convex` JWT template configured (Configure → JWT Templates → Convex preset)
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and Convex env `CLERK_JWT_ISSUER_DOMAIN` set
- Username and Phone requirements **disabled** in Clerk's User & Authentication settings

## License

Private — all rights reserved.
