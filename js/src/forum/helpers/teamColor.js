/** The member's club colour, used by the corner wedge and the avatar ring. */
export function teamColor(user) {
  if (!user || typeof user.attribute !== 'function') return null;

  const team = user.attribute('favoriteTeam');
  return team && team.color ? team.color : null;
}
