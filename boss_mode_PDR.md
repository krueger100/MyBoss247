# Boss Mode — Product Design Requirements (PDR)

**Version:** 1.0
**Date:** 2026-03-30
**Status:** Draft

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Target Audience](#3-target-audience)
4. [Goals and Success Metrics](#4-goals-and-success-metrics)
5. [Monetization Model](#5-monetization-model)
6. [User Stories](#6-user-stories)
7. [Feature Requirements](#7-feature-requirements)
8. [Technical Architecture](#8-technical-architecture)
9. [Database Schema](#9-database-schema)
10. [Screen Structure and Navigation](#10-screen-structure-and-navigation)
11. [UX and Design Principles](#11-ux-and-design-principles)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Risks and Mitigations](#13-risks-and-mitigations)
14. [Implementation Phases](#14-implementation-phases)
15. [Out of Scope](#15-out-of-scope)

---

## 1. Product Overview

**Product Name:** Boss Mode
**Tagline:** You're the employee. The app is your boss.
**Platforms:** iOS, Android, Web (cross-platform via React Native + Expo)

Boss Mode is an accountability app built specifically for solo entrepreneurs who struggle with motivation, self-discipline, and meeting their own deadlines. The core mechanic is a role reversal: the app takes on the role of a strict, no-nonsense Boss, and the user is the Employee. The Boss assigns structured tasks, checks in multiple times a day, enforces warnings, and triggers real financial penalties when the employee fails to deliver.

The app combines hierarchical goal management, AI-driven accountability, real financial stakes, and competitive social challenges between entrepreneur peers to create the most psychologically compelling accountability tool available.

---

## 2. Problem Statement

Most entrepreneurs work for themselves — no manager watching over them, no HR, no performance reviews, and no consequences for missed deadlines. This freedom is also the biggest threat to their productivity.

**Core problems:**

- No external accountability structure means tasks are perpetually deferred
- Self-set deadlines carry no real weight or consequence
- Existing productivity apps (Todoist, Notion, ClickUp) are passive tools — they track tasks but do not enforce them
- Motivation is inconsistent; discipline requires systems, not willpower
- Entrepreneurs lack peers who share the same accountability challenges in a structured way

**What is missing:** An app that behaves like a real authority figure — one that checks in, escalates, and enforces — backed by real financial consequences that actually hurt.

---

## 3. Target Audience

### Primary User

- Solo entrepreneurs, freelancers, indie hackers, and solopreneurs
- Age 25–45
- Self-employed with no direct manager
- Motivated but struggles with self-discipline and follow-through
- Comfortable with mobile productivity tools
- Willing to put money on the line to enforce personal accountability

### Secondary User

- Small founding teams (2–3 people) who want shared accountability
- Business coaches and mentors who want to hold clients accountable
- Anyone who responds to high-stakes commitment devices

### User Mindset

The target user has read books like *Atomic Habits*, *The War of Art*, or *Deep Work*. They know what they should be doing. They just need someone — or something — to make them do it.

---

## 4. Goals and Success Metrics

### Product Goals


| Goal                     | Metric                                 | Target                                 |
| ------------------------ | -------------------------------------- | -------------------------------------- |
| Drive daily active usage | DAU / MAU ratio                        | > 50%                                  |
| Build daily habit        | Day 7 retention                        | > 40%                                  |
| Build weekly habit       | Day 30 retention                       | > 25%                                  |
| Monetisation             | Paid conversion rate                   | > 15% of active users                  |
| Stickiness               | Average session frequency              | 4+ opens per day (driven by check-ins) |
| Social growth            | % users with 1+ accountability partner | > 35% within 30 days                   |
| Penalty engagement       | % users with penalty configured        | > 60% by day 14                        |


### North Star Metric

**Tasks completed on time per active user per week** — this measures whether the app is actually changing behaviour, not just being opened.

---

## 5. Monetization Model

### Subscription Tiers


|                               | 3-Day Free Trial      | Pro                                                  | VIP                                |
| ----------------------------- | --------------------- | ---------------------------------------------------- | ---------------------------------- |
| **Price**                     | $0 (3 days only)      | $13.95/mo                                            | $39.95/mo                          |
| **Projects**                  | 1                     | Unlimited                                            | Unlimited                          |
| **Check-ins/day**             | 2 (morning + evening) | 4 (all scheduled) + Boss Inbox                       | 4 + Boss Inbox (Intense mode)      |
| **Boss Chat**                 | 10 messages/day       | Unlimited                                            | Unlimited + priority responses     |
| **Boss Personality**          | Tough Coach only      | All 3 modes                                          | All 3 modes + custom tone tuning   |
| **Opportunity Cost Clock**    | Basic (daily value)   | Full (daily + hourly + per-task + captured/slipping) | Full + per-project breakdown       |
| **Accountability Partners**   | 1 partner             | Unlimited                                            | Unlimited                          |
| **Standard Challenges**       | 1 active              | Unlimited                                            | Unlimited                          |
| **VIP High Stakes**           | Not available         | Not available                                        | Full access ($5,000+ challenges)   |
| **Weekly Performance Review** | Summary only (no AI)  | Full AI-generated review                             | Full AI review + monthly deep-dive |
| **Personal Days**             | 1/month               | 2/month (configurable up to 5)                       | 3/month (configurable up to 5)     |
| **Penalty System**            | Charity only          | Charity + Partner                                    | Charity + Partner + VIP escrow     |
| **Analytics**                 | Basic stats           | Detailed reports                                     | Advanced analytics + export        |


### Revenue Streams


| Stream                    | Source                                                                 | Expected % of Revenue     |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------- |
| **Subscriptions**         | Pro + VIP monthly plans                                                | 70%                       |
| **VIP Platform Fee**      | 2–3% fee on all VIP High Stakes escrow pots (on top of verifier fee)   | 15%                       |
| **Annual Discounts**      | Pro Annual ($111.60/yr = save 33%), VIP Annual ($319.60/yr = save 33%) | Included in subscriptions |
| **Verifier Marketplace**  | If Boss Mode sources verifiers, take a 30% cut of their fee            | 10%                       |
| **Enterprise/Team Plans** | Future: teams of 5-20 with a shared Boss dashboard (v2.0)              | 5%                        |


### Monetization Timing in UX

- **3-day free trial** gives full Pro access with no credit card required. Users experience the complete product before committing.
- **After 3 days:** App locks behind a paywall. Users must choose Pro ($13.95/mo) or VIP ($39.95/mo) to continue. No free tier — the Boss doesn't work for free.
- **Paywall screen:** The Boss delivers the upgrade prompt in-character: "Your trial is over. You've seen what I can do. Now pay up or walk away." — never a generic modal.
- **VIP upsell triggers:** When a Pro user taps "Create VIP Challenge" or tries to access advanced analytics, they see a VIP upgrade prompt.
- Stripe handles all subscription billing. Apple/Google IAP for mobile subscriptions.
- **Grace period:** If subscription lapses, users get a 48-hour grace period before data access is paused. Penalties and challenges are frozen, not cancelled.

### Key Monetization Metrics


| Metric                  | Target              |
| ----------------------- | ------------------- |
| Trial → Paid conversion | > 40% within 3 days |
| Pro vs VIP split        | 70% Pro / 30% VIP   |
| Monthly churn (Pro)     | < 8%                |
| Monthly churn (VIP)     | < 5%                |
| LTV (Pro)               | > $100              |
| LTV (VIP)               | > $280              |


---

## 6. User Stories

### Onboarding (2-screen fast start)

- As a new user, I want to get to my Dashboard in under 60 seconds so I experience value before committing.
- As a new user, I want to create my first project and set its earning potential in a single screen so setup feels fast.
- As a new user, I want The Boss to set my first 3 tasks for me so I don't start with a blank screen.

### Progressive Onboarding (unlocked after first 3 tasks)

- As an engaged user, I want to sign a formal employment contract with The Boss so I feel the weight of commitment.
- As an engaged user, I want to choose my Boss personality style so the tone matches how I'm motivated.
- As an engaged user, I want to configure my penalty preferences and link a payment method so consequences become real.
- As an engaged user, I want to set detailed goals (yearly → daily) so my tasks have structure.

### Daily Usage

- As an employee, I want The Boss to check in with me multiple times a day via push notifications so I stay on track.
- As an employee, I want to see all my tasks for today on a single dashboard so I know exactly what I need to do.
- As an employee, I want to check off completed tasks so The Boss acknowledges my progress.
- As an employee, I want to invoke a Personal Day before midnight to protect my streak when I have a legitimate reason to pause.
- As an employee, I want to see the opportunity cost of my wasted time ticking up in real-time so I feel the urgency of every hour.

### Boss Interaction

- As an employee, I want to chat with The Boss to explain blockers, request extensions, or get advice so I have a channel to push back.
- As an employee, I want The Boss to send me unexpected check-in messages throughout the day so I can never fully relax when I'm behind.
- As an employee, I want to receive a formal weekly performance review every Sunday so I have a structured reflection ritual.

### Penalties

- As an employee, I want to configure penalty amounts per task tier so the financial stakes match the severity of each commitment.
- As an employee, I want to choose whether my penalties go to charity or an accountability partner so I decide who benefits from my failures.
- As an employee, I want to see a "money at stake today" number on my dashboard so the cost of failure is always visible.

### Accountability Partners

- As an employee, I want to invite other entrepreneurs as accountability partners so we can hold each other accountable.
- As an employee, I want to see my partner's task completion rate and streak so I know if they're keeping up.
- As an employee, I want to create a head-to-head challenge with a partner and put money on the line so we compete.
- As an employee, I want the loser of a challenge to automatically pay the winner so the consequences are enforced without awkwardness.

### Gamification

- As an employee, I want to see my streak count and Personal Days remaining on my dashboard so I'm motivated to protect my streak.
- As an employee, I want a lifetime stats page showing my total earnings from partners, total paid out, and challenge win/loss record so I can see my track record.

---

## 6. Feature Requirements

### 6.1 Authentication and Profile

**Requirements:**

- Sign up and sign in via email/password, Google OAuth, and Apple Sign-In
- User profile: display name, avatar, timezone (critical for check-in scheduling)
- Each user has a unique invite code for partner referrals
- Profile stores: boss settings, Stripe customer ID, Stripe Connect account ID, virtual salary, contract acceptance status

**Acceptance criteria:**

- User can sign up, verify email, and reach Dashboard in under 2 minutes
- Google and Apple auth work on iOS, Android, and Web
- Timezone is detected automatically but editable

---

### 6.2 Onboarding (2-Screen Fast Start + Progressive Commitment)

**Design principle:** Get users to value in under 60 seconds. Don't ask for commitment until they've felt the product.

**Phase A — Fast Start (before Dashboard, 2 screens only):**


| Screen         | What it does                                                             | Time   |
| -------------- | ------------------------------------------------------------------------ | ------ |
| 1. Sign Up     | Email/password or Google/Apple OAuth                                     | 15 sec |
| 2. Quick Start | Enter project name + what it could earn per year + pick Boss personality | 30 sec |


- After Screen 2, user lands on Dashboard immediately with:
  - Their first project created
  - The Boss auto-generates 3 starter tasks based on the project name (via OpenAI)
  - Opportunity Cost Clock is live
  - The Boss sends a welcome message in chat: "You just clocked in. Here's your first 3 tasks. Prove to me you're serious."
- User has a **3-day free trial** with full Pro access (no credit card required)

**Phase B — Progressive Onboarding (triggered after completing first 3 tasks):**

After the user completes their first 3 tasks (proving engagement), the app progressively prompts:


| Trigger           | What unlocks                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| 3 tasks completed | Boss says "Good start. Before we go further — sign your contract." → Employment Contract screen              |
| Contract signed   | Boss asks "How do you want me to manage you?" → Boss Personality confirmation (already selected, can change) |
| Day 2             | Boss prompts "Let's set your bigger goals." → Goal setup flow (yearly → daily)                               |
| Day 3             | Boss prompts "Time to put money on the line." → Penalty setup + payment method                               |
| Day 5             | Boss prompts "You need a rival." → Invite a partner                                                          |


**Employment Contract (now part of progressive flow):**

- Triggered after first 3 tasks, not at signup
- Contract text covers: check-in obligations, penalty terms, Boss authority, employee responsibilities
- User must scroll to bottom before "I Accept and Sign" button activates
- Acceptance is stored with timestamp in the database
- Contract is viewable at any time in Profile > My Contract
- If penalty settings are materially changed, user is prompted to re-sign an updated contract

**Acceptance criteria:**

- New users reach Dashboard with live tasks in under 60 seconds
- Boss auto-generates 3 relevant starter tasks within 5 seconds of project creation
- Contract prompt appears after task #3 is completed, not before
- Penalty setup prompt appears on Day 3, not at signup
- Users who have not signed the contract can still use the app (penalties are inactive until contract is signed)

---

### 6.3 Projects, Goals, and Tasks

**Hierarchy (top to bottom):**

```
Project (e.g. "My SaaS App", "E-commerce Store", "Consulting Biz")
  └── Yearly Goal
        └── Quarterly Goal(s)
              └── Monthly Goal(s)
                    └── Weekly Goal(s)
                          └── Daily Task(s)
                                └── Milestones (at any level)
```

**Project Requirements:**

- Entrepreneurs can create multiple projects representing different business ventures, apps, or income streams
- Each project has: title, description, colour label, icon, status (active/paused/completed), sort order, and **annual earning potential** (e.g. $10M/year)
- Annual potential is set per project — the app auto-calculates daily and hourly value per project
- Projects list view displays each project's earning potential alongside progress (e.g. "Worth $27,397/day")
- Projects are displayed in a reorderable list — drag to move higher-priority projects to the top
- Each project has its own goal hierarchy (yearly → daily) and its own progress percentage
- Tapping a project opens a **Project Detail** view showing all goals and tasks within that project
- Projects tab has two sub-views accessible via a segmented control:
  - **Projects View:** All projects listed by priority order, with progress bars and task counts
  - **All Tasks View:** Every task across all projects in a flat list, each tagged with its project name and colour label
- Tasks display their project badge (name + colour) everywhere they appear (Dashboard, Task Detail, Check-In)
- Projects can be archived but not deleted (preserves history and stats)

**Goal and Task Requirements:**

- Create, read, update, and delete goals at any level
- Goals have: title, description, timeframe, start date, due date, status, parent goal link, **project_id**
- Tasks have: title, description, due date, due time, priority (high/medium/low), status, recurring flag, recurrence rule, **project_id**
- Recurring tasks: daily, weekdays only, weekly on specific days, monthly
- Progress percentage auto-calculated per goal and per project based on child task/goal completion
- Visual progress bars at each level
- Tasks can be dragged to reorder within a day
- Overdue tasks are flagged automatically after due time passes
- Filter views: Today, This Week, This Month, This Quarter, This Year, All — each filterable by project
- Opportunity Cost Clock calculates per-task value using the combined daily value across all projects

**Acceptance criteria:**

- Creating a new project takes under 30 seconds
- Reordering projects via drag updates the list instantly
- Creating a yearly goal within a project and drilling it down to a daily task takes under 3 minutes
- Completing a daily task updates the parent goal AND parent project progress bars in real-time
- All Tasks view clearly shows which project each task belongs to via colour-coded badges
- Overdue status triggers within 5 minutes of deadline passing

---

### 6.4 Boss Check-In System

**Scheduled check-in types:**


| Check-In          | Default Time | Message Tone                               |
| ----------------- | ------------ | ------------------------------------------ |
| Morning Brief     | 8:00 AM      | Directive — sets the day's agenda          |
| Midday Check      | 12:00 PM     | Firm — demands a progress update           |
| Afternoon Push    | 3:00 PM      | Urgent — counts remaining tasks            |
| End of Day Review | 6:00 PM      | Evaluative — reviews what was accomplished |


**Requirements:**

- All check-in times are configurable per user (in Boss Settings)
- Check-ins are delivered as push notifications and create an in-app card on the Dashboard
- Employee must respond: tap tasks as complete, or provide a written excuse
- Ignored check-ins escalate: next message from the Boss is more severe
- Check-in response is logged in the database
- Check-ins are triggered by Supabase Edge Functions on a per-user cron schedule

**Acceptance criteria:**

- Check-in notifications arrive within 2 minutes of scheduled time
- Ignored check-in triggers a follow-up within 1 hour with escalated tone
- Employee can respond to a check-in in under 30 seconds

---

### 6.5 Boss Personality Modes

**Concept:** Different entrepreneurs respond to different management styles. A one-size-fits-all drill-sergeant tone will motivate some and make others uninstall. Boss Personality Modes let users choose the management style that drives them best.

**Three modes:**


| Mode                      | Tone                                                 | Example Check-In                                                      | Example Missed Task                                                                                                 |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Drill Sergeant**        | Aggressive, zero tolerance, military-style           | "0800. Five tasks. No excuses. Move."                                 | "You failed. That's $10 gone. This is unacceptable. Fix it NOW."                                                    |
| **Tough Coach** (default) | Firm but fair, results-focused, direct               | "Morning. Here's your plan for today. Let's see what you're made of." | "You missed the deadline. That's not like you. What happened? Fix it today."                                        |
| **Supportive Manager**    | Encouraging, empathetic, but still holds accountable | "Good morning! Here's your plan. I believe you can crush this today." | "Hey, you missed one. That's okay — it happens. But let's make sure it doesn't become a pattern. What do you need?" |


**Requirements:**

- Boss personality is selected during Quick Start onboarding (Screen 2) and can be changed any time in Boss Settings
- The selected mode changes the **system prompt** for all Boss interactions: chat, check-ins, Boss Inbox, Performance Reviews, contract tone
- All three modes maintain accountability — the Supportive Manager still enforces penalties, just with gentler language
- Free tier users are locked to Tough Coach. Pro and VIP can choose any mode.
- The Boss references the mode in-character: "You picked Drill Sergeant. Don't regret it."
- Each mode has a distinct avatar expression on the Dashboard mood indicator

**Implementation:** This is primarily a system prompt change per mode — no UI engineering difference. Store `boss_personality` (enum: drill_sergeant|tough_coach|supportive_manager) in `boss_settings` jsonb on the users table.

---

### 6.6 AI Boss Chat

**Requirements:**

- Persistent chat interface styled as a messaging app (Boss on left, Employee on right)
- Boss persona is determined by the user's selected Boss Personality Mode
- Employee can: ask for advice, report blockers, request deadline extensions, justify failures
- System prompt injects: personality mode, current tasks and statuses, completion rate, active penalties, streak, recent missed tasks
- The Boss references real data in responses (e.g., "You've missed 3 tasks this week")
- Boss responds in character at all times — never breaks the fourth wall
- Chat history is persisted and paginated

**Boss Persona Guidelines (adapt tone per personality mode):**

- Speaks in short, direct sentences (Drill Sergeant: shortest; Supportive Manager: slightly longer)
- No praise for mediocre performance (all modes — degree varies)
- Acknowledges good work: Drill Sergeant ("Adequate."), Tough Coach ("That's what I expect."), Supportive ("Great job! Keep that momentum going!")
- Challenges excuses: Drill Sergeant ("Excuses are for civilians."), Tough Coach ("That's not a reason. That's a choice."), Supportive ("I hear you, but let's find a way around it.")
- Uses the user's first name

**Acceptance criteria:**

- Boss response time under 5 seconds
- Boss persona remains consistent across 50+ messages in a session
- Deadline extension requests are handled in-character (Boss may deny or grant with conditions)

---

### 6.6 Warning and Escalation System

**Status levels:**


| Level             | Colour | Condition                                   | Action                                             |
| ----------------- | ------ | ------------------------------------------- | -------------------------------------------------- |
| On Track          | Green  | All tasks progressing normally              | Positive reinforcement in check-ins                |
| Warning           | Yellow | Task due within 4 hours with no progress    | Push notification + yellow dashboard indicator     |
| Serious Warning   | Orange | Task overdue by up to 24 hours              | Escalated push notification + orange indicator     |
| Final Warning     | Red    | Task overdue by 24+ hours, penalty imminent | Red alert notification + Boss sends urgent message |
| Penalty Triggered | Black  | Grace period expired                        | Stripe charge initiated automatically              |


**Requirements:**

- Status level is recalculated every 15 minutes via Supabase Edge Function
- Dashboard displays the highest active warning level prominently
- Each escalation level sends a distinct push notification
- Boss chat messages reflect current warning level in tone
- User can resolve a warning by completing or officially failing the task

---

### 6.7 Penalty System

**Requirements:**

- User configures penalty amounts per tier during onboarding:
  - Daily task missed: configurable (suggested default $5–$25)
  - Weekly goal missed: configurable (suggested default $25–$100)
  - Monthly goal missed: configurable (suggested default $50–$200)
  - Quarterly goal missed: configurable (suggested default $100–$500)
  - Milestone missed: configurable (custom per milestone)
- For each penalty, user selects a target: **Charity** or **Accountability Partner**
- Penalty triggers after a configurable grace period (default: 24 hours after deadline)
- Stripe charges the user's saved payment method automatically
- If charity: Stripe transfers funds to the charity's account
- If partner: Stripe Connect transfers funds to the partner's connected account
- Receipt generated and stored for both parties
- All penalty payments logged in Payment History
- Dashboard shows "Money at Stake Today" — combined total of all active penalty risks

**Acceptance criteria:**

- Penalty charge completes within 10 minutes of trigger event
- User receives push notification and email receipt when charged
- Partner receives push notification and Stripe transfer when they win a penalty payment
- Failed charges (card declined) retry 3 times over 24 hours, then alert the user

---

### 6.8 Accountability Partners and Challenges

#### Partner System

**Requirements:**

- Invite partners via unique invite code or email search
- Partner request: send → accept/decline → active partnership established
- Each partnership has a configurable default penalty amount
- Partners can view each other's: task completion rate, current streak, active warnings, challenge history
- Partner gets push notification when their partner misses a task
- Partner visibility is mutual — both parties see the same data

#### Challenge System

**Requirements:**

- Any partner can create a challenge:
  - Title and description
  - Start and end dates
  - Stake amount per participant
  - Penalty target: winner takes stake OR losers donate to charity
- Each participant adds their own tasks to the challenge scope
- Live leaderboard updates in real-time as tasks are completed (Supabase real-time)
- Challenge resolution:
  - Highest completion % at end date wins
  - Ties: participant with fewest missed deadlines wins
  - Loser's stake is automatically charged and paid out
- Challenge types: 1v1 Duel, Group Challenge (3+ participants — post-launch)
- Active challenges show on Dashboard with mini-leaderboard card

#### Gamification

- Streak: consecutive days with 100% daily task completion
- Win/loss record per partnership
- Lifetime stats: challenges won, total earned from partners, total paid out, total saved by completing on time
- Global leaderboard among all partners ranked by completion rate and streak

#### VIP High Stakes ($5,000+)

**Concept:** For entrepreneurs who are dead serious about execution, VIP High Stakes challenges are milestone-based 1v1 duels with $5,000+ on the line and a real human verifier who reviews evidence and determines the winner. This is not about daily task completion — it's about shipping real outcomes.

**Requirements:**

- VIP challenges have a minimum stake of $5,000 per participant ($10,000+ pot)
- Challenges are based on **milestones**, not task completion:
  - Each participant defines 1–3 specific, measurable milestones (e.g. "Launch MVP to production", "Close 10 paying customers", "Hit $5K MRR")
  - Milestones must be verifiable with evidence (screenshots, URLs, Stripe dashboards, analytics, signed contracts, etc.)
- **Human Verifier:**
  - Each VIP challenge is assigned a verified, impartial human reviewer
  - The verifier reviews submitted milestone evidence from both participants
  - The verifier determines: milestone achieved (yes/no) for each participant, and declares the winner
  - Verifier decisions are final and binding
  - Verifiers are sourced from a curated panel (experienced entrepreneurs, business coaches, or Boss Mode staff)
  - Verifier fee is deducted from the pot (e.g. 5–10%) or paid separately by participants
- **Evidence submission:**
  - Each participant uploads proof of milestone completion: screenshots, URLs, video walkthroughs, or documents
  - Evidence is timestamped and visible to both participants and the verifier
  - Participants cannot see each other's evidence until both have submitted (prevents copying)
- **Payout:**
  - If one participant completes all milestones and the other doesn't → winner takes the full pot (minus verifier fee)
  - If both complete all milestones → the one who completed first wins (timestamp-based)
  - If neither completes → stakes are donated to charity (no refunds — this is the point)
  - Payouts are held in escrow via Stripe until the verifier makes a final determination
- **VIP Badge:** Users who have completed a VIP challenge receive a VIP badge on their profile, visible to partners
- VIP challenges appear in a dedicated "VIP High Stakes" section on the Partners tab, visually distinct from standard challenges (gold/premium styling)
- VIP challenge history and W/L record tracked separately in Lifetime Stats

---

### 6.9 Home Screen Widget

**Requirements:**

- Available on iOS (WidgetKit) and Android (Glance / Jetpack Compose)
- Widget displays: Boss mood icon, today's task progress (e.g. "3 of 7 done"), current streak count
- Widget updates when tasks are completed (within 5 minutes)
- Tapping widget deep-links to the Dashboard tab
- Small (2x2) and medium (4x2) sizes supported
- Boss mood icon changes based on current warning level: happy (green), stern (yellow), angry (orange/red)

---

### 6.10 Weekly Performance Review

**Requirements:**

- Generated every Sunday at a configurable time (default: 7:00 PM)
- Generated by OpenAI with full week's task and penalty data injected into prompt
- Review content includes:
  - Overall performance score (0–100)
  - Tasks completed vs. total assigned
  - Penalties triggered and total amount charged
  - Longest streak during the week
  - Opportunity cost: value captured vs. value lost this week
  - What went well (Boss's assessment)
  - What needs improvement
  - The Boss's expectations for next week
- Delivered as a push notification: "Your weekly review is ready."
- Styled as a formal HR performance review document in-app
- All reviews archived in Profile > Performance History

---

### 6.11 Personal Days (Streak Protection)

**Requirements:**

- Each user receives 2 Personal Days per month (configurable in Boss Settings: 0–5)
- Personal Day can only be invoked for the current day, before midnight local time
- Invoking a Personal Day: pauses all penalty triggers for that day, preserves the current streak
- Personal Day usage is visible to all accountability partners
- Monthly allowance resets automatically on the 1st of each month
- The Boss sends an in-character acknowledgement when a Personal Day is invoked
- Dashboard shows: "Personal Days remaining this month: X of Y"
- If no Personal Days remain, user cannot invoke one (no retroactive use)

---

### 6.12 Boss Inbox (Random Unexpected Messages)

**Requirements:**

- The Boss sends between 0–3 unscheduled messages during working hours (configurable window, default 9 AM–6 PM)
- Message content is context-aware: generated by OpenAI based on current task status, streak, penalty history, and completion rate
- Frequency configurable in Boss Settings: Off / Light (1x daily) / Normal (2x daily) / Intense (3x daily)
- Messages arrive as push notifications and appear in Boss Chat
- Messages are distinct from scheduled check-ins — shorter, more spontaneous in tone
- Examples: "I pulled your numbers. Three tasks still open. Explain.", "You went quiet. That worries me. Update me now."

---

### 6.13 Opportunity Cost Clock (Time = Money)

**Concept:** Instead of a virtual "paycheck" (employee mindset), Boss Mode shows entrepreneurs the opportunity cost of their wasted time based on what their business could be worth. If you believe your business can make $10M/year, every wasted day costs you $27,000. Every wasted hour costs you $1,141. This reframe hits harder than a salary because it's tied to the entrepreneur's own vision of success.

**Requirements:**

- Each project has its own annual earning potential, set when the project is created (and editable any time)
- During onboarding, user sets the potential for their first project. Additional projects get their potential set at creation time.
- App auto-calculates per project:
  - **Daily value:** annual potential ÷ 365 (e.g. $10M ÷ 365 = $27,397/day)
  - **Hourly value:** annual potential ÷ 8,760 hours (e.g. $10M ÷ 8,760 = $1,142/hour)
  - **Per-task value:** project daily value ÷ number of tasks assigned for that day in that project
- Dashboard Opportunity Cost Clock shows the **combined** daily value across all active projects
- Dashboard displays a live **Opportunity Cost Clock**:
  - "Today is worth **$27,397** to your future."
  - As tasks are completed, the "captured value" increases in green
  - As hours pass with incomplete tasks, "value slipping away" ticks up in red
  - End of day: shows total captured vs. total lost
- The clock creates urgency: every hour that passes without task completion is money visibly draining
- Dashboard card: "You've captured $18,264 of today's $27,397 potential. $9,133 is slipping away."
- If all daily tasks completed: "Full day captured. $27,397 secured."
- Opportunity cost data is included in the Sunday Performance Review:
  - "This week you captured $164,000 of $191,780 potential. $27,780 left on the table."
- Lifetime stats tracked in Profile > Stats:
  - Total value captured, total value lost, capture rate %
- User can update their annual potential at any time in Profile > Business Settings
- The Boss references opportunity cost in chat: "You've wasted 2 hours. That's $2,282 you'll never get back."

---

## 7. Technical Architecture

### Stack


| Layer              | Technology                     | Rationale                                                        |
| ------------------ | ------------------------------ | ---------------------------------------------------------------- |
| Frontend           | React Native + Expo SDK 52     | Cross-platform iOS, Android, Web from a single codebase          |
| Navigation         | Expo Router (file-based)       | Industry standard for Expo, supports deep linking                |
| UI Library         | Tamagui                        | Cross-platform components that render correctly on Web           |
| State Management   | Zustand                        | Lightweight, no boilerplate, works well with React Native        |
| Backend            | Supabase                       | PostgreSQL + Auth + Edge Functions + Realtime in one service     |
| Database           | PostgreSQL (via Supabase)      | Relational, supports complex queries for goal hierarchy          |
| Edge Functions     | Supabase Edge Functions (Deno) | Serverless, co-located with database, cron support               |
| AI                 | OpenAI GPT-4o                  | Best-in-class for consistent persona and context-aware responses |
| Payments           | Stripe + Stripe Connect        | Charity donations + peer-to-peer transfers                       |
| Push Notifications | Expo Notifications + APNs/FCM  | Unified cross-platform notification API                          |
| Widget             | expo-widgets                   | iOS WidgetKit + Android Glance via Expo                          |


### Architecture Diagram

```
Client Apps (iOS / Android / Web)
        │
        ▼
Expo Router + React Native UI
        │
        ▼
Supabase Client (auth + database + realtime)
        │
   ┌────┴─────────────────────────────┐
   │                                  │
   ▼                                  ▼
Supabase PostgreSQL            Supabase Edge Functions
(goals, tasks, penalties,            │
 chat, payments, partners)      ┌────┴────────────────────────────┐
                                │            │           │         │
                                ▼            ▼           ▼         ▼
                            boss-checkin  ai-chat  process-    process-
                            (cron)        (OpenAI) penalty     challenge
                                                   (Stripe)    (Stripe)
```

### Edge Functions


| Function             | Trigger                         | Purpose                                                     |
| -------------------- | ------------------------------- | ----------------------------------------------------------- |
| `boss-checkin`       | Cron (per user schedule)        | Sends scheduled check-in notifications                      |
| `boss-inbox`         | Cron (randomised within window) | Sends random Boss Inbox messages                            |
| `performance-review` | Cron (weekly, Sunday)           | Generates and stores weekly review via OpenAI               |
| `ai-chat`            | HTTP (user message)             | Proxies OpenAI chat completion with injected context        |
| `warning-escalation` | Cron (every 15 min)             | Updates task warning levels, sends escalation notifications |
| `process-penalty`    | DB trigger (task/goal failed)   | Charges Stripe, routes to charity or partner                |
| `process-challenge`  | Cron (challenge end date)       | Determines winner, processes payouts                        |
| `paycheck-reset`     | Cron (Monday 00:00)             | Resets weekly paycheck, logs previous week result           |
| `personal-day-reset` | Cron (1st of month)             | Resets monthly Personal Day allowance                       |


---

## 8. Database Schema

### Key Tables

**users**

```
id (uuid, PK), email, display_name, avatar_url, timezone,
invite_code (unique), boss_settings (jsonb),
stripe_customer_id, stripe_connect_account_id,
contract_signed_at (timestamp), personal_days_remaining (int),
personal_days_per_month (int), created_at
```

**projects**

```
id (uuid, PK), user_id (FK), title, description,
colour (string — hex colour label), icon (string — emoji),
status (enum: active|paused|completed|archived),
sort_order (int — lower = higher priority),
annual_potential (decimal — earning potential per year),
progress_percentage (decimal), created_at
```

**goals**

```
id (uuid, PK), user_id (FK), project_id (FK), title, description,
timeframe (enum: daily|weekly|monthly|quarterly|milestone|yearly),
start_date, due_date, status (enum: active|completed|failed|paused),
parent_goal_id (FK, nullable), progress_percentage (decimal),
created_at
```

**tasks**

```
id (uuid, PK), goal_id (FK), user_id (FK), project_id (FK),
title, description, due_date, due_time,
priority (enum: high|medium|low),
status (enum: pending|in_progress|completed|overdue|failed),
warning_level (enum: green|yellow|orange|red),
is_recurring (bool), recurrence_rule (jsonb),
completed_at, created_at
```

**penalties**

```
id (uuid, PK), user_id (FK), penalty_target (enum: charity|partner),
charity_name, charity_stripe_id, partner_id (FK, nullable),
amount (decimal), trigger_type (enum: task_missed|goal_missed|milestone_missed|challenge_lost),
linked_goal_id (FK), linked_challenge_id (FK), is_active (bool)
```

**penalty_payments**

```
id (uuid, PK), penalty_id (FK), payer_user_id (FK), recipient_user_id (FK, nullable),
amount (decimal), stripe_payment_id, stripe_transfer_id,
status (enum: pending|charged|transferred|failed), charged_at
```

**check_ins**

```
id (uuid, PK), user_id (FK), task_id (FK, nullable),
boss_message (text), employee_response (text),
check_in_type (enum: morning|midday|afternoon|evening|warning|inbox),
created_at
```

**chat_messages**

```
id (uuid, PK), user_id (FK), role (enum: boss|employee),
content (text), created_at
```

**performance_reviews**

```
id (uuid, PK), user_id (FK), week_start_date, week_end_date,
score (int), tasks_completed (int), tasks_total (int),
penalties_triggered (int), penalty_total (decimal),
review_text (text), value_captured (decimal), value_potential (decimal),
created_at
```

**payment_methods**

```
id (uuid, PK), user_id (FK), stripe_customer_id,
stripe_payment_method_id, is_default (bool)
```

**partnerships**

```
id (uuid, PK), partner_a_id (FK), partner_b_id (FK),
status (enum: pending|active|ended),
default_penalty_amount (decimal), created_at
```

**challenges**

```
id (uuid, PK), created_by (FK), title, description,
start_date, end_date, stake_amount (decimal),
penalty_target (enum: charity|winner),
status (enum: pending|active|completed|cancelled),
winner_id (FK, nullable), created_at
```

**challenge_participants**

```
id (uuid, PK), challenge_id (FK), user_id (FK),
tasks_completed (int), tasks_total (int),
completion_percentage (decimal),
status (enum: active|won|lost)
```

**challenge_tasks**

```
id (uuid, PK), challenge_id (FK), task_id (FK),
user_id (FK), counted_for_challenge (bool)
```

**personal_days_log**

```
id (uuid, PK), user_id (FK), date_used (date),
reason (text, optional), streak_protected (int), created_at
```

**vip_challenges**

```
id (uuid, PK), created_by (FK), title, description,
stake_amount (decimal — min $5,000 per participant),
escrow_stripe_payment_intent_id (string),
verifier_id (FK — references verifiers table),
verifier_fee_percent (decimal — e.g. 0.05 for 5%),
status (enum: pending_escrow|active|evidence_submitted|under_review|completed|cancelled),
winner_id (FK, nullable), verifier_decision_text (text),
start_date, end_date, decided_at (timestamp), created_at
```

**vip_participants**

```
id (uuid, PK), vip_challenge_id (FK), user_id (FK),
status (enum: escrow_pending|active|evidence_submitted|won|lost),
escrow_charged (bool), escrow_stripe_id (string)
```

**vip_milestones**

```
id (uuid, PK), vip_challenge_id (FK), user_id (FK),
title (string), description (text),
success_criteria (text — what counts as "done"),
status (enum: pending|evidence_submitted|verified|failed),
evidence_submitted_at (timestamp), verified_at (timestamp)
```

**vip_evidence**

```
id (uuid, PK), vip_milestone_id (FK), user_id (FK),
evidence_type (enum: screenshot|url|video|document),
file_url (string), description (text),
submitted_at (timestamp)
```

**verifiers**

```
id (uuid, PK), name, email, bio (text),
expertise_areas (text[]), verified (bool),
total_challenges_reviewed (int), created_at
```

---

## 9. Screen Structure and Navigation

### Tab Navigation (5 tabs)


| Tab       | Icon    | Purpose                                                                                   |
| --------- | ------- | ----------------------------------------------------------------------------------------- |
| Dashboard | Home    | Today view: tasks across all projects, check-ins, streak, money at stake, boss mood       |
| Projects  | Folder  | All projects (reorderable), project detail with goals/tasks, All Tasks cross-project view |
| Partners  | Users   | Partner list, challenges, leaderboard                                                     |
| Boss Chat | Message | AI chat, check-in history, Boss Inbox messages                                            |
| Profile   | Person  | Settings, contract, payment, performance history                                          |


### Full Screen Map

```
(auth)
  ├── login
  ├── signup
  └── forgot-password

onboarding/ (fast start — 2 screens before Dashboard)
  ├── quick-start       (project name + earning potential + Boss personality — 1 screen)
  └── [Dashboard]       (Boss auto-generates 3 starter tasks, user starts immediately)

progressive-onboarding/ (triggered by milestones, not at signup)
  ├── contract          (Employment Contract — triggered after 3rd task completed)
  ├── goal-setup        (yearly → daily goals — triggered Day 2)
  ├── penalty-setup     (amounts, payment method, charity — triggered Day 3)
  └── invite-partner    (partner invitation — triggered Day 5)

(tabs)/
  ├── index             (Dashboard)
  ├── projects          (Projects — list view + all tasks view)
  ├── partners          (Partners & Challenges)
  ├── chat              (Boss Chat)
  └── profile           (Profile & Settings)

Modal / Stack screens
  ├── project/[id]      (Project detail — goals + tasks within project)
  ├── project/create    (Create/edit project)
  ├── task/[id]         (Task detail + status update + project badge)
  ├── goal/[id]         (Goal detail + progress)
  ├── goal/create       (Create/edit goal — select project)
  ├── task/create       (Create/edit task — select project)
  ├── checkin/[id]      (Check-in response modal)
  ├── review/[id]       (Weekly performance review)
  ├── partner/[id]      (Partner profile + stats)
  ├── partner/invite    (Invite partner)
  ├── challenge/[id]    (Challenge detail + leaderboard)
  ├── challenge/create  (Create challenge)
  ├── vip/[id]          (VIP High Stakes detail — milestones, evidence, verifier)
  ├── vip/create        (Create VIP challenge — milestones, stake, partner)
  ├── vip/evidence/[id] (Submit evidence for a milestone)
  ├── profile/contract  (View signed contract)
  ├── profile/penalty   (Penalty settings)
  ├── profile/boss      (Boss settings: check-in times, inbox frequency)
  ├── profile/payment   (Payment method setup)
  ├── profile/charity   (Select charities)
  ├── profile/history   (Payment history)
  └── profile/reviews   (Performance Review archive)
```

---

## 10. UX and Design Principles

### Core Design Language

- **Corporate / Professional** — the UI should feel like a real workplace tool, not a fun gamified app. Think Slack meets HR software.
- **Boss is always present** — The Boss's presence should be felt throughout. Mood indicator, avatar, and messages are visible at all times on the Dashboard.
- **High contrast, minimal clutter** — The user needs to take action fast. The Dashboard must be scannable in under 5 seconds.
- **Dark theme as default** — Entrepreneurs often work late. Dark mode is the primary theme; light mode is optional.

### Warning Colour System (consistent throughout the app)


| Status                  | Colour     | Hex     |
| ----------------------- | ---------- | ------- |
| On Track                | Green      | #22C55E |
| Warning                 | Yellow     | #EAB308 |
| Serious Warning         | Orange     | #F97316 |
| Final Warning / Penalty | Red        | #EF4444 |
| Penalty Triggered       | Near Black | #1C1C1E |


### Tone of Voice

- The Boss speaks in the second person, directly ("You missed the deadline.")
- Never apologetic, never vague
- Acknowledges good performance briefly, never effusively
- The app copy itself (buttons, labels, empty states) leans into the metaphor:
  - "Clocked In" not "Logged In"
  - "Today's Briefing" not "Today's Tasks"
  - "Submit Report" not "Save Response"
  - "Review Your Contract" not "Terms of Service"

### Key UX Flows

**Daily habit loop:**
Morning push notification → open app → see Dashboard briefing → check off tasks throughout day → Boss check-in response → end of day review → streak updated

**Penalty moment:**
Task overdue → red warning on Dashboard → Boss sends urgent message → grace period countdown visible → either complete task or face charge → Stripe charge → receipt shown → Boss acknowledges in chat

**Personal Day flow:**
User taps "Invoke Personal Day" on Dashboard → confirmation screen with Boss quote → streak preserved → partners notified → counter decrements

---

## 11. Non-Functional Requirements

### Performance

- App cold start under 3 seconds on mid-range devices
- Dashboard load (all today's data) under 1.5 seconds
- Boss chat response under 5 seconds
- Check-in notifications delivered within 2 minutes of scheduled time
- Warning level recalculation within 15 minutes of status change

### Reliability

- Penalty charge failure rate under 1%
- Retry logic: 3 attempts over 24 hours on failed Stripe charges
- Push notification delivery rate target: > 95%
- Edge Function uptime: Supabase SLA (99.9%)

### Security

- All payment data handled exclusively through Stripe (no card numbers stored in our database)
- Supabase Row Level Security (RLS) on all tables — users can only access their own data
- Partner data access controlled by RLS: only active partners can read each other's stats
- JWT authentication on all API calls
- Supabase Edge Function secrets for OpenAI and Stripe keys (never exposed to client)

### Scalability

- Database schema supports multiple users without architectural changes
- Edge Functions are stateless and horizontally scalable
- Supabase real-time handles live challenge leaderboards efficiently

### Privacy

- User financial data (penalty amounts, payment history) is private — not visible to partners
- Partners can see task completion rate and streak only — not penalty amounts
- Challenge stakes are visible only to challenge participants
- Compliance with GDPR and CCPA: data deletion on request

### Accessibility

- Minimum WCAG 2.1 AA compliance
- All interactive elements have accessible labels
- Font sizes respect system accessibility settings
- Colour indicators always paired with text labels (not colour alone)

---

## 12. Risks and Mitigations


| Risk                                                    | Likelihood | Impact | Mitigation                                                                                                                                               |
| ------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apple App Store rejects penalty auto-charge             | Medium     | High   | Frame penalties as "voluntary commitment deposits" set up in advance. Ensure clear disclosure at onboarding. Review App Store guideline 3.1.1 carefully. |
| Stripe Connect KYC drop-off reduces partner adoption    | High       | Medium | Phase 6: launch partner system without real money first (honour system + screenshot). Add Stripe Connect in v1.1.                                        |
| Legal classification of financial penalties as gambling | Low        | High   | Add legal disclaimer. Frame as "commitment contracts" not wagers. Consult solicitor before launch in UK/Australia.                                       |
| OpenAI API costs scale unexpectedly                     | Medium     | Medium | Cache Boss Inbox and Review responses. Rate-limit Boss Chat to 20 messages/day on free tier.                                                             |
| Push notification permissions denied by users           | High       | High   | Make check-in value obvious during onboarding. Show prompt at the moment the user sets their first check-in time (contextual).                           |
| User burns out from Boss intensity and churns           | Medium     | High   | Personal Days, configurable Boss intensity settings, and a "Vacation Mode" (pauses all check-ins and penalties for a set period).                        |


---

## 13. Implementation Phases

### Phase 1 — Foundation

**Goal:** Working app with 2-screen fast start, functional Dashboard, and subscription infrastructure

- Initialise Expo project with TypeScript, Expo Router, Tamagui
- Set up Supabase: project, auth (email + Google + Apple), RLS policies
- Create all database migrations (including subscription tier tracking)
- Build auth flow (sign up, sign in, forgot password)
- Quick Start screen: project name + earning potential + Boss personality picker (1 screen)
- Supabase Edge Function: auto-generate 3 starter tasks via OpenAI based on project name
- 5-tab navigation with placeholder screens
- Dashboard with live tasks, Opportunity Cost Clock, Boss mood indicator
- Stripe subscription integration (3-day free trial + Pro/VIP tiers, no free tier after trial)
- In-character upgrade prompts when free-tier limits are hit

**Definition of Done:** User can sign up, set up 1 project in under 60 seconds, land on Dashboard with 3 auto-generated tasks, and see the Opportunity Cost Clock live. Subscription paywall works.

---

### Phase 2 — Goal and Task Engine + Progressive Onboarding

**Goal:** Full goal hierarchy, task management, and progressive commitment flow

- Project CRUD: create, edit, reorder (drag to prioritise), archive
- Project Detail screen with goals and tasks scoped to that project
- Projects tab with two sub-views: Projects List (reorderable) and All Tasks (cross-project with project badges)
- Hierarchical goal creation flow within a project (yearly → daily)
- Task CRUD with all fields — every task and goal linked to a project
- Goal and task detail screens — task detail shows project badge
- Progress calculation logic (task → goal → project, all levels update on completion)
- Dashboard Today view with live task list showing project badges per task
- Streak tracking logic
- Personal Days system (invoke, log, reset monthly)
- Opportunity Cost Clock: per-project daily/hourly value calculation, live Dashboard display
- **Progressive onboarding triggers:**
  - After 3 tasks completed → Employment Contract screen
  - After contract signed → Boss personality confirmation
  - Day 2 → Goal setup flow prompt
  - Day 3 → Penalty + payment setup prompt
  - Day 5 → Partner invitation prompt
- Boss personality mode system (3 modes, stored in user settings, applied to all system prompts)

**Definition of Done:** User can create goals, drill to daily tasks, check them off, see progress update at all levels, and see opportunity cost ticking. Progressive onboarding triggers fire at the right milestones. Boss personality affects all Boss messages.

---

### Phase 3 — Boss Check-In System

**Goal:** Scheduled and random Boss messages driving daily engagement

- Expo push notification setup and permission request flow
- Supabase Edge Function: `boss-checkin` (cron per user schedule)
- Check-in card on Dashboard (pending response state)
- Check-in response screen (mark tasks, write excuse)
- Warning escalation Edge Function (every 15 min)
- Dashboard warning level indicator
- Boss mood indicator on Dashboard
- Boss Inbox: randomised Edge Function + frequency settings
- Weekly Performance Review: Sunday cron + OpenAI generation + review screen + archive

**Definition of Done:** User receives scheduled check-ins, can respond, sees warning levels update, receives random Boss messages, and gets a Sunday performance review.

---

### Phase 4 — AI Boss Chat

**Goal:** Full AI Boss Chat with persona and context awareness

- Supabase Edge Function: `ai-chat` (OpenAI proxy)
- Boss Chat screen (message bubbles, input, send)
- System prompt engineering (Boss persona + context injection)
- Context injector: pull user's current tasks, completion rate, streak, warning level, penalties
- Chat history persistence and pagination
- Check-in messages route through Boss Chat
- Boss Inbox messages appear in Boss Chat thread

**Definition of Done:** User can have a multi-turn conversation with The Boss, Boss references real task data, persona is consistent across sessions.

---

### Phase 5 — Penalty and Payment System

**Goal:** Real financial consequences automated end-to-end

- Stripe integration: save payment methods (Stripe Elements)
- Stripe Connect onboarding flow (for receiving partner payments)
- Penalty configuration screen (per tier, per target)
- Charity selection screen (curated list of 10–15 charities)
- Supabase Edge Function: `process-penalty` (Stripe charge + transfer)
- Automated penalty trigger when grace period expires
- Push notification + receipt on charge
- Payment History screen
- Dashboard "Money at Stake Today" counter
- Retry logic for failed charges

**Definition of Done:** Penalty charges automatically and routes correctly to charity or partner account, with full audit trail.

---

### Phase 6 — Accountability Partners and Challenges

**Goal:** Social accountability layer with real-money competitive challenges

- Partner invite system (invite code + email)
- Partner accept/decline flow
- Partner profile screen (completion rate, streak, challenge history)
- Partner penalty notifications (partner missed a task)
- Challenge creation flow
- Task assignment to challenges
- Real-time challenge leaderboard (Supabase real-time)
- Supabase Edge Function: `process-challenge` (winner determination + payout)
- Win/loss records and lifetime stats
- Dashboard: active challenge mini-card

**Definition of Done:** Two users can partner up, create a challenge, compete in real-time, and the loser automatically pays the winner.

---

### Phase 7 — Polish and Launch Prep

**Goal:** Production-ready app ready for App Store and Play Store submission

- Full onboarding flow with Boss introduction chat
- Analytics and reports screen (weekly/monthly summaries)
- Dark mode (default) + light mode toggle
- Home screen widget: iOS (WidgetKit) + Android (Glance)
- App Store and Play Store assets: screenshots, descriptions, preview video
- Web deployment via Expo Web + custom domain
- Performance profiling and optimisation
- Accessibility audit (WCAG 2.1 AA)
- Legal: Terms of Service, Privacy Policy, penalty disclaimer

**Definition of Done:** App passes App Store and Play Store review, widget works on both platforms, web version is deployed.

---

## 14. Out of Scope (v1.0)

The following are intentionally excluded from v1.0 to keep scope manageable:

- **Group challenges (3+ participants)** — 1v1 only in v1.0; group challenges added post-launch
- **Honour-system penalty bypass** — Stripe charges are enforced; no manual override in v1.0
- **Calendar sync** (Google Calendar / Apple Calendar) — planned for v1.1
- **Task templates** (pre-built goal frameworks by entrepreneur type) — v1.1
- **Public milestone posts** (LinkedIn / X sharing) — v1.1
- **Vacation Mode** (full pause of check-ins and penalties) — v1.1
- **Business coach / mentor account type** — v2.0
- **In-app referral / affiliate system** — v2.0
- **Native macOS / Windows desktop app** — v2.0
- **Stripe Connect KYC for partner payments** (v1.0 will use honour system for partner-to-partner transfers; automated Stripe Connect transfers in v1.1)

---

*End of PDR v1.0*