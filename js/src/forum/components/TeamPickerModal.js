import app from 'flarum/forum/app';
import Modal from 'flarum/common/components/Modal';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import { loadTeams } from '../utils/teams';

/**
 * Grid picker of all FBS teams (logo + name). Used by the account-settings
 * "Favorite Team" control and, in `required` mode, by the block-until-chosen
 * registration gate (non-dismissible until a team is saved).
 */
export default class TeamPickerModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    this.teams    = null;
    this.loading  = true;
    this.error    = false;
    this.saving   = false;
    this.filter   = '';
    this.selected = app.session.user ? app.session.user.attribute('favoriteTeamId') || null : null;
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    loadTeams()
      .then((teams) => {
        this.teams   = teams;
        this.loading = false;
        m.redraw();
      })
      .catch(() => {
        this.error   = true;
        this.loading = false;
        m.redraw();
      });
  }

  // Required mode (registration gate) can't be dismissed until a team is saved.
  isDismissible() {
    return !this.attrs.required;
  }

  className() {
    return 'FavTeamPicker-modal Modal--large';
  }

  title() {
    return this.attrs.required
      ? app.translator.trans('ernestdefoe-favorite-team.forum.gate_title')
      : app.translator.trans('ernestdefoe-favorite-team.forum.choose');
  }

  content() {
    const t = (k) => app.translator.trans(`ernestdefoe-favorite-team.forum.${k}`);

    if (this.loading) {
      return m('.Modal-body', m(LoadingIndicator, { display: 'block' }));
    }

    if (this.error) {
      return m('.Modal-body', m('.Alert.Alert--error', t('loading_error')));
    }

    const needle = this.filter.trim().toLowerCase();
    const shown = needle
      ? this.teams.filter((team) => team.name.toLowerCase().includes(needle))
      : this.teams;

    return m('.Modal-body', [
      this.attrs.required
        ? m('p.FavTeamPicker-help', t('gate_help'))
        : null,

      m('input.FormControl.FavTeamPicker-search', {
        type: 'search',
        placeholder: t('search_placeholder'),
        value: this.filter,
        oninput: (e) => { this.filter = e.target.value; },
        autofocus: true,
      }),

      m('.FavTeamPicker-grid',
        shown.map((team) =>
          m('button.FavTeamPicker-tile', {
            type: 'button',
            key: team.id,
            className: String(this.selected) === String(team.id) ? 'is-selected' : '',
            onclick: () => { this.selected = team.id; m.redraw(); },
          }, [
            m('img.FavTeamPicker-tileLogo', { src: team.logo, alt: '', loading: 'lazy' }),
            m('span.FavTeamPicker-tileName', team.name),
          ])
        )
      ),

      m('.FavTeamPicker-actions', [
        m(Button, {
          className: 'Button Button--primary',
          loading: this.saving,
          disabled: !this.selected || this.saving,
          onclick: () => this.save(this.selected),
        }, this.saving ? t('saving') : t('save')),

        !this.attrs.required && app.session.user && app.session.user.attribute('favoriteTeamId')
          ? m(Button, {
              className: 'Button Button--link',
              disabled: this.saving,
              onclick: () => this.save(null),
            }, t('clear'))
          : null,
      ]),
    ]);
  }

  save(teamId) {
    if (this.saving) return;
    this.saving = true;
    m.redraw();

    app.session.user
      .save({ favoriteTeamId: teamId })
      .then(() => {
        this.saving = false;
        if (this.attrs.onSaved) this.attrs.onSaved(teamId);
        this.hide();
      })
      .catch(() => {
        this.saving = false;
        m.redraw();
      });
  }
}
