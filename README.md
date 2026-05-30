# Favorite Team

[![Floxum](https://floxum.com/extension/ernestdefoe/favorite-team/badge/name)](https://floxum.com/extension/ernestdefoe/favorite-team)
[![Version](https://floxum.com/extension/ernestdefoe/favorite-team/badge/highest-version)](https://floxum.com/extension/ernestdefoe/favorite-team)
[![Downloads](https://floxum.com/extension/ernestdefoe/favorite-team/badge/downloads)](https://floxum.com/extension/ernestdefoe/favorite-team)
[![Review](https://floxum.com/extension/ernestdefoe/favorite-team/badge/review)](https://floxum.com/extension/ernestdefoe/favorite-team)
[![License](https://floxum.com/extension/ernestdefoe/favorite-team/badge/license)](https://floxum.com/extension/ernestdefoe/favorite-team)

A [Flarum](https://flarum.org) 2.x extension that lets members pick a favorite
FBS (NCAA Division I-A) college-football team. The team's logo is displayed
under the member's avatar on posts and on their profile.

## Features

- **Team picker** — a searchable grid of all 136 FBS teams (logo + name) in the
  member's account settings.
- **Avatar badge** — the chosen team's logo overlays the bottom-left corner of
  the avatar on posts (with the team name on hover), and on the profile / user
  card.
- **Require at registration (optional)** — an admin toggle that forces new
  members to pick a team before they can use the forum. It shows a
  non-dismissible picker on the next page load for any logged-in member who
  hasn't chosen yet (works with normal, social, and SSO sign-ups).
- **No database migration** — the choice is stored in the member's existing
  preferences, so it loads with the user row (no extra query when rendering the
  badge across a page of posts).
- **Logos via the ESPN CDN** — no images are bundled or hosted by the extension.

## Installation

```bash
composer require ernestdefoe/favorite-team
php flarum cache:clear
```

Then enable **Favorite Team** in the admin panel under Extensions.

## Usage

### For members

Go to **Settings** → **Favorite Team** → **Choose your team**, search or scroll
the grid, pick a team, and save. The logo then shows under your avatar.

### For admins

Open the **Favorite Team** extension page in the admin panel and toggle
**Require members to pick a team** to force the choice at registration. It's off
by default.

## How it works

- The FBS team list is bundled as static reference data in
  [`resources/teams.json`](resources/teams.json) (id, name, abbreviation, color,
  and ESPN logo URL per team).
- The chosen team id is stored in the member's `preferences`
  (`ernestdefoe-favorite-team.team`).
- The core `UserResource` is extended with two fields:
  - `favoriteTeamId` — writable by the member themselves (or an admin), validated
    against the bundled team list.
  - `favoriteTeam` — a read-only resolved object (`id`, `name`, `logo`, …) used to
    render the badge; readable by everyone.
- `GET /api/fbs-teams` returns the full team list for the picker.

## API

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/api/fbs-teams` | Full FBS team list (registered users). |
| `PATCH` | `/api/users/{id}` | Set `favoriteTeamId` (self or admin). |

## Configuration

| Admin setting | Default | Effect |
|---|---|---|
| Require members to pick a team | off | Blocks members without a team until they choose. |

## Notes

Team names and logos are the property of their respective institutions and are
served from ESPN's public logo CDN. This is an unofficial fan tool and is not
affiliated with or endorsed by the NCAA, ESPN, or any team.

## Support

Questions, bug reports, and feature requests:

- **Support forum:** https://ernestdefoe.online
- **Issues:** https://github.com/ernestdefoe/favorite-team/issues

## License

MIT
