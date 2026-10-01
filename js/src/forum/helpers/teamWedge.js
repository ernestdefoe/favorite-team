/**
 * The club mark as a rounded wedge in the bottom-right corner of a post.
 *
 * 🚨 Decorative, and marked as such: aria-hidden and pointer-events none. The
 * affiliation is stated in words on the member's profile; repeating it to a
 * screen reader on every post in a thread would be noise.
 */
export default function teamWedge(user) {
  if (!user || typeof user.attribute !== 'function') return null;

  const team = user.attribute('favoriteTeam');
  if (!team || !team.logo) return null;

  return m('span.FavTeamWedge', { 'aria-hidden': 'true' }, [
    m('img.FavTeamWedge-crest', { src: team.logo, alt: '', loading: 'lazy' }),
  ]);
}

/** The club colour, for the wedge and the avatar ring. */
export function teamColor(user) {
  if (!user || typeof user.attribute !== 'function') return null;

  const team = user.attribute('favoriteTeam');
  return team && team.color ? team.color : null;
}
