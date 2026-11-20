# Iron Trench

A one-stage dieselpunk browser arcade game. Traverse the trench, take the optional **Iron Pig** mech, and defeat the two-phase **Iron Colossus**. The original standalone prototype is preserved byte for byte as [prototype.html](prototype.html).

## Run locally

Use Node 24 (CI uses Node 24).

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. No account, API key, backend, or remote assets are required. Audio is original Web Audio synthesis and starts muted; the sound toggle unlocks it after a gesture.

| Play action | Keyboard | Touch |
| --- | --- | --- |
| Move / aim | A/D or ←/→ to move; W/S or ↑/↓ to aim vertically. Combine to aim diagonally. | Direction pad; hold two buttons to aim diagonally. |
| Jump | Space | Jump |
| Fire | J | Fire |
| Reflect shells or stun nearby enemies | K | Parry |
| Toss the empty core and reload | L (ammo must be zero) | Core |
| Enter or eject from the mech | E | Mech |

Use supply crates to restore health and refill the magazine. Parry just before incoming shells reach you; reflected shells hit harder than normal fire. In the Iron Pig, fire does not use the runner's ammo. Ejecting gives a short invulnerability window.

## Verify

```sh
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

Vitest covers fixed-tick movement, swept hit detection, aiming, parry, core toss, ejection, the boss and golden replay state hashes. Playwright exercises Chromium desktop and iPhone-sized touch layouts. Set `CHROMIUM_PATH` to use an already installed Chromium. The simulation uses a seeded PRNG and a fixed 60 Hz step independent of rendering.

The branch delivers one complete playable stage, not the proposed four-stage campaign. Custom stage serialization, mod validation, leaderboards and co-op remain outside this slice.
