# Iron Trench

A two-stage dieselpunk browser arcade game. Pick a stage in the field briefing, or clear Stage 01 and select **Next: Foundry**.

- **01 · Iron Trench:** Traverse the trench, take the optional **Iron Pig** mech, and defeat the two-phase **Iron Colossus**.
- **02 · Underground Foundry:** Cross an industrial rail lane and defeat the two-phase **Furnace Warden**. The crossing signal progresses from **CLEAR** (green) to **CART INCOMING** (amber) to **CART ON RAIL** (red). Enter early in the clear window, wait for the next clear, or jump over the cart. The cart cannot be parried.

The original standalone prototype is preserved byte for byte as [prototype.html](prototype.html).

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

Vitest covers fixed-tick movement, swept hit detection, aiming, parry, core toss, ejection, both bosses, rail warning and avoidance, full-stage routes, and golden replay state hashes for both stages. Playwright exercises selection and play in Chromium desktop and iPhone-sized touch layouts. Set `CHROMIUM_PATH` to use an already installed Chromium. The simulation uses a seeded PRNG and a fixed 60 Hz step independent of rendering.

Two stages of the proposed four-stage campaign are playable. Custom stage serialization, mod validation, leaderboards and co-op remain outside this slice.
