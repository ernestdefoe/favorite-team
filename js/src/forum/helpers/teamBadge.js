import Tooltip from 'flarum/common/components/Tooltip';

/**
 * Small team-logo badge shown on a user's avatar. Returns null when the user
 * has no favorite team (or it isn't loaded on this resource). Wrapped in a
 * Flarum Tooltip so hovering the logo shows the team name.
 */
export default function teamBadge(user) {
  if (!user || typeof user.attribute !== 'function') return null;

  const team = user.attribute('favoriteTeam');
  if (!team || !team.logo) return null;

  return m(
    Tooltip,
    { text: team.name },
    m('span.FavTeamBadge', [m('img.FavTeamBadge-logo', { src: team.logo, alt: team.name, loading: 'lazy' })])
  );
}
