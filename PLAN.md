# RPG-Style XP & Leveling System

## Features

- **XP from everything**: Earn XP for completing runs, finishing workouts, logging food, hitting daily nutrition goals, and maintaining streaks
- **Starting level from quiz**: After the onboarding quiz, your fitness level determines your starting level (Beginner → Lv 1, Intermediate → Lv 5, Advanced → Lv 10)
- **RPG rank titles**: Each level range has a unique title — Rookie, Warrior, Gladiator, Champion, Titan, Legend, and more
- **Level-up celebration**: When you level up, a big animated popup appears with confetti-style particles, haptic feedback, your new rank title, and a motivational message
- **XP breakdown visibility**: A card on the Dashboard shows your current level, rank title, XP progress bar, and how much XP until next level

## XP Earning Rules

| Action | XP Earned |
|---|---|
| Complete a run | 50 XP + 10 XP per mile |
| Complete a workout | 75 XP |
| Log a food entry | 15 XP |
| Hit calorie goal for the day | 50 XP bonus |
| Hit protein goal for the day | 30 XP bonus |
| Each day of run streak (3+) | +10 XP bonus per day |
| Each day of workout streak (3+) | +10 XP bonus per day |
| Each day of food streak (3+) | +5 XP bonus per day |

## RPG Ranks

- **Lv 1–4**: Rookie 🌱
- **Lv 5–9**: Warrior ⚔️
- **Lv 10–14**: Gladiator 🛡️
- **Lv 15–19**: Champion 🏆
- **Lv 20–29**: Titan ⚡
- **Lv 30–39**: Legend 🔥
- **Lv 40+**: Mythic 👑

## Leveling Curve

XP required increases per level (e.g. Lv 1→2 = 100 XP, Lv 10→11 = 250 XP, Lv 20→21 = 500 XP), so early levels feel fast and rewarding while higher levels require real dedication.

## Design

- **Dashboard XP Card**: A dark card with a glowing accent-colored XP progress bar, your rank icon/emoji, level number in bold, rank title, and "X XP to next level" underneath. Sits near the top of the Dashboard, below the greeting.
- **Level-up popup**: Full-screen overlay with a dark semi-transparent background, animated particles radiating outward, the new level number scaling up with a spring animation, the rank title and emoji, and a "Continue" button. Strong haptic feedback on trigger.
- **Rank badge**: A small badge next to your level on the Dashboard card, colored to match the rank tier (green for Rookie, blue for Warrior, purple for Gladiator, gold for Champion, orange for Titan, red for Legend, prismatic for Mythic).

## Screens / Changes

- **Dashboard (home tab)**: New XP card added below the greeting header, showing level, rank, and XP progress
- **Onboarding quiz**: After the gym quiz determines fitness level, the starting level and XP are calculated and stored
- **Level-up modal**: A new overlay component that appears app-wide whenever a level-up is detected
- **Stats tab**: A section showing total XP earned, XP history breakdown by category (runs, workouts, food), and current rank progress
