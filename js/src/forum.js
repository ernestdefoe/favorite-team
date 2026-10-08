import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import TeamPickerModal from './forum/components/TeamPickerModal';
import FavoriteTeamSettings from './forum/components/FavoriteTeamSettings';
import teamBadge from './forum/helpers/teamBadge';
import { teamColor } from './forum/helpers/teamColor';
import { watch, unwatch, removeFloats } from './forum/helpers/wedgeReserve';
import crestUrl from './forum/helpers/crest';

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
  // 🚨 Drawn ENTIRELY in CSS, from two custom properties on .Post.
  //
  // The obvious route — appending a wedge element — does not work here.
  // CommentPost.content() returns a LIST in which .Post-body is one entry, so
  // pushing onto it makes the wedge a sibling of the card: it then anchors to
  // .Post and hangs below the card across the Reply link. Reaching into that
  // vnode's children instead simply rendered nothing.
  //
  // A pseudo-element on .Post-body needs no DOM injection at all, and
  // .Post-body is the white card — the one element in a post that is both
  // positioned and clipping.
  //
  // 🚨 The properties go on the POST, not on the card. A custom property
  // inherits DOWN, so one set on the card is unreachable to the avatar ring
  // out in the side column.
  extend('flarum/forum/components/CommentPost', 'elementAttrs', function (attrs) {
    const post = this.attrs.post;
    const user = post && typeof post.user === 'function' ? post.user() : null;
    const color = teamColor(user);
    if (!color) return;

    const team = user.attribute('favoriteTeam');

    attrs.className = (attrs.className || '') + ' FavTeam-post';
    attrs.style = Object.assign({}, attrs.style, {
      '--fav-team': color,
      // The crest rides along as a custom property so the wedge is drawn
      // entirely in CSS — see the note below.
      '--fav-crest': team && (team.wedgeLogo || team.logo) ? 'url("' + crestUrl(team.wedgeLogo || team.logo, 42) + '")' : 'none',
      // The outline colour that makes this crest read on this club's colour.
      '--fav-halo': team && team.crestHalo === 'light' ? 'rgba(255, 255, 255, 0.92)' : 'rgba(10, 12, 16, 0.85)',
    });
  });

  // ── Keep the text out from under the wedge ───────────────────────────────
  //
  // The wedge reserves its own corner of the content with two floats — see
  // helpers/wedgeReserve.js for why floats and not padding. While the post is
  // being edited the body holds the composer preview instead, and the reserve
  // comes out.
  function syncReserve(component) {
    try {
      const el = component.element;
      const body = el && el.querySelector('.Post-body');
      if (!body) return;

      if (el.classList.contains('FavTeam-post') && !component.isEditing()) {
        // Keyed on the content: onupdate runs on every redraw of the stream,
        // and only new content (or a new body) needs a fresh fit — the
        // observer covers every change of size.
        watch(body, component.attrs.post.contentHtml());
      } else {
        unwatch(body);
        removeFloats(body);
      }
    } catch (e) {
      // A layout nicety must never take the post stream down with it.
    }
  }

  extend('flarum/forum/components/CommentPost', 'oncreate', function () {
    syncReserve(this);
  });

  extend('flarum/forum/components/CommentPost', 'onupdate', function () {
    syncReserve(this);
  });

  extend('flarum/forum/components/CommentPost', 'onremove', function () {
    try {
      unwatch(this.element && this.element.querySelector('.Post-body'));
    } catch (e) {}
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
