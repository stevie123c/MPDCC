# Million Points Drop

A web-based interactive game inspired by the TV show "Million Pound Drop," adapted for team events and office fun! Allocate points, lock in your answers, and see how many points your team can keep until the end.

## Project Premise

- Start with 1,000,000 points (P).
- For each question, split your points across answer zones in increments of 25,000P or 100,000P.
- At least one zone must be left empty each round.
- Lock in your allocations before the timer runs out, or it will lock automatically.
- Reveal wrong answers one by one—points on those zones are lost!
- Only points on the correct answer survive to the next round.
- Play through 10 rounds and see how many points your team can keep!

This game is designed for a host to control the UI, with a team playing together in the room.

## How to Run Locally

1. **Install dependencies:**
   ```
   cd million-points-drop
   npm install
   ```
2. **Start the development server:**
   ```
   npm run dev
   ```
3. **Open your browser:**
   Visit [http://localhost:5173](http://localhost:5173) to play the game.

## Features
- Interactive point allocation and lock-in
- Animated zone elimination and correct answer highlight
- Sound effects for key game events (add your own in `public/sounds/`)
- Accessible and keyboard-friendly controls
- Mobile responsive UI

---

Enjoy Million Points Drop with your team!
