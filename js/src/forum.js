import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import TeamPickerModal from './forum/components/TeamPickerModal';
import FavoriteTeamSettings from './forum/components/FavoriteTeamSettings';
import teamBadge from './forum/helpers/teamBadge';

app.initializers.add('ernestdefoe-favorite-team', () => {
  // The favorite-team fields are read via user.attribute(...) directly — no
  // model-prototype accessor, since the User class is a lazy chunk and is
  // undefined this early in boot.

  // Core components below are code-split (lazy) chunks — extend them by module
  // PATH (string), not `.prototype`, so the extension is applied when the chunk
  // loads rather than no-op'ing against an undefined class at boot.

  // ── Account settings: favorite-team control ──────────────────────────────
  extend('flarum/forum/components/SettingsPage', 'settingsItems', function (items) {
    if (!this.user) return;
    items.add('ernestdefoe-favorite-team', m(FavoriteTeamSettings), 5);
  });

  // ── Logo badge under the avatar (posts + profile/user card) ──────────────
  // Posts: add the badge to the post's side column (where the avatar lives) at
  // a priority below the avatar's (100), so it sits directly under the avatar.
  extend('flarum/forum/components/CommentPost', 'sideItems', function (items) {
    const post = this.attrs.post;
    const user = post && typeof post.user === 'function' ? post.user() : null;
    const badge = teamBadge(user);
    if (badge) {
      items.add('ernestdefoe-favorite-team', badge, -10);
    }
  });

  // Profile/user card: add the badge to .UserCard-profile's ItemList (where the
  // avatar lives) so CSS can overlay it on the avatar corner. Using the
  // profileItems seam keeps us out of mutating core's returned vnode tree.
  extend('flarum/forum/components/UserCard', 'profileItems', function (items) {
    const badge = teamBadge(this.attrs.user);
    if (badge) {
      items.add('ernestdefoe-favorite-team', badge, -10);
    }
  });

  // ── Block-until-chosen registration gate ─────────────────────────────────
  // HeaderPrimary renders on every page; its oncreate fires after the app has
  // mounted (so app.modal is ready). Fire the gate once.
  let gated = false;
  extend('flarum/forum/components/HeaderPrimary', 'oncreate', function () {
    if (gated) return;
    gated = true;

    const user = app.session.user;
    if (!user) return;
    if (!app.forum.attribute('ernestdefoe-favorite-team.requireAtRegistration')) return;
    if (user.attribute('favoriteTeam')) return;

    app.modal.show(TeamPickerModal, { required: true });
  });
});
