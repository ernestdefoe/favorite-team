import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import TeamPickerModal from './forum/components/TeamPickerModal';
import FavoriteTeamSettings from './forum/components/FavoriteTeamSettings';
import teamBadge from './forum/helpers/teamBadge';
import teamWedge, { teamColor } from './forum/helpers/teamWedge';

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

  // ── The club as a corner wedge on the post ───────────────────────────────
  //
  // 🚨 The colour is set on the POST element, not on the wedge.
  //
  // A custom property inherits DOWN, so a colour set on the corner span is
  // unreachable to anything outside it — the avatar ring included. Putting it
  // on .Post lets everything in the post read the same value.
  extend('flarum/forum/components/CommentPost', 'elementAttrs', function (attrs) {
    const post = this.attrs.post;
    const user = post && typeof post.user === 'function' ? post.user() : null;
    const color = teamColor(user);
    if (!color) return;

    attrs.className = (attrs.className || '') + ' FavTeam-post';
    attrs.style = Object.assign({}, attrs.style, { '--fav-team': color });
  });

  // 🚨 Appended to content(), which is the children of .Post-BODY.
  //
  // .Post-body is the white card: it is the only element here that is both
  // positioned and clipping, so it is the one a corner wedge can anchor to.
  // .Post-footer is height:0 in core, so anything put there falls outside the
  // post entirely and lands under the separator.
  extend('flarum/forum/components/CommentPost', 'content', function (vdom) {
    const post = this.attrs.post;
    const user = post && typeof post.user === 'function' ? post.user() : null;
    const wedge = teamWedge(user);
    if (!wedge || !Array.isArray(vdom)) return;

    /*
     * 🚨 content() returns a LIST in which .Post-body is one entry — it is not
     * the body's own children. Pushing onto it makes the wedge a SIBLING of the
     * card, so it anchors to .Post instead and hangs 51px below the card, over
     * the Reply link.
     *
     * The wedge has to go inside the .Post-body vnode, which is the white card
     * and the only element here that is both positioned and clipping.
     */
    const body = vdom.find(
      (v) => v && v.attrs && typeof v.attrs.className === 'string' && v.attrs.className.indexOf('Post-body') !== -1
    );

    if (!body) return;

    body.children = (Array.isArray(body.children) ? body.children : [body.children]).concat(wedge);
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
