/**
 * Small team-logo badge shown under a user's avatar. Returns null when the
 * user has no favorite team (or it isn't loaded on this resource).
 */
export default function teamBadge(user) {
  if (!user || typeof user.attribute !== 'function') return null;

  const team = user.attribute('favoriteTeam');
  if (!team || !team.logo) return null;

  return m('span.FavTeamBadge', { title: team.name }, [
    m('img.FavTeamBadge-logo', { src: team.logo, alt: team.name, loading: 'lazy' }),
  ]);
}
