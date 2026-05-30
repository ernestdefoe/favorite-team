import app from 'flarum/forum/app';

// The FBS list is static reference data, so fetch it once per page load and
// hand the cached promise to every caller (settings picker + registration gate).
let cache = null;

export function loadTeams() {
  if (!cache) {
    cache = app
      .request({ method: 'GET', url: app.forum.attribute('apiUrl') + '/fbs-teams' })
      .then((body) => body.data || [])
      .catch((e) => {
        cache = null; // allow a retry on next open
        throw e;
      });
  }
  return cache;
}
