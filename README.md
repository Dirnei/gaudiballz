
![Logo](docs/logo.svg)
# Gaudi Ballz
[![CI](https://github.com/Dirnei/gaudiballz/actions/workflows/ci.yml/badge.svg)](https://github.com/Dirnei/gaudiballz/actions/workflows/ci.yml)
[![Play](https://img.shields.io/badge/play-gaudiballz.leberkas.org-blue)](https://gaudiballz.leberkas.org/)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/dirnei)

A browser-based colour-sorting puzzle game. Sort the balls into flasks to clear the board.

<img src="docs/gameplay.png" alt="Gameplay" width="280" />

## Features

- Procedurally generated levels with increasing difficulty
- Undo, hints, and restart
- Leaderboard and personal stats
- Activity feed
- Installable as a PWA

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite, Framer Motion
- **Backend**: .NET 10 / C#
- **Database**: MongoDB
- **Deployment**: Docker

## Getting Started

```bash
docker compose up -d --build
```

The app runs at `http://localhost:8123`.
