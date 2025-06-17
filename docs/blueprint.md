# **App Name**: Bot Dashboard

## Core Features:

- Start Button: Start button to open a modal for bot selection (ChatGPT or Perplexity).
- Bot Selection Modal: Modal to choose between 'Run ChatGPT Bot' and 'Run Perplexity Bot' options.
- Timer: Timer to display elapsed time since bot start, formatted as hh:mm:ss, persists until stopped.
- Backend Bot Execution: Trigger Python scripts (chatgpt_bot.py or perplexity_bot.py) on Vercel backend via internal API calls.
- Stop Button: Stop button to halt the running bot and timer.
- Session Logging: Log session information (bot type, start time, end time, duration, date) to a CSV or SQLite file on the backend via internal API calls.
- Logs Table: Display a sortable, searchable table of bot session logs fetched from the backend.

## Style Guidelines:

- Primary color: Soft purple (#B19CD9) to evoke a sense of calmness and focus.
- Background color: Light gray (#F0F0F0) for a clean, modern aesthetic.
- Accent color: Teal (#45B8AC) for interactive elements and key actions, to catch the user's attention.
- Body and headline font: 'Inter' (sans-serif) for a modern, clean, and readable interface.
- Use minimalist icons to represent bot status and actions.
- Responsive layout, mobile-friendly, with clear section separation and padding.
- Subtle fade-in and slide-in animations for toast notifications and modal transitions.
- Start Button: #A3BFFA to initiate bot flow
- Stop Button: #FF7875 to end execution gracefully
- Hover / Interactive: #4DD0E1 for buttons, modals, menus
- Background: #F8F9FA for overall background / cards
- Headings / Labels: #2F3E4D for all text for key actions
- Subtext / Notes: #7B8A97 for time, status, descriptions