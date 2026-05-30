import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import TeamPickerModal from './TeamPickerModal';

/**
 * Account-settings control: shows the current favorite team (logo + name) and
 * a button to open the picker.
 */
export default class FavoriteTeamSettings extends Component {
  view() {
    const t = (k) => app.translator.trans(`ernestdefoe-favorite-team.forum.${k}`);
    const team = app.session.user && app.session.user.attribute('favoriteTeam');

    return m('.FavoriteTeamSettings.Form-group', [
      m('label', t('settings_heading')),
      m('.helpText', t('settings_help')),

      m('.FavoriteTeamSettings-current', [
        team
          ? [
              m('img.FavoriteTeamSettings-logo', { src: team.logo, alt: '' }),
              m('span.FavoriteTeamSettings-name', team.name),
            ]
          : m('span.FavoriteTeamSettings-none', t('none')),

        m(Button, {
          className: 'Button',
          onclick: () => app.modal.show(TeamPickerModal, { onSaved: () => m.redraw() }),
        }, team ? t('change') : t('choose')),
      ]),
    ]);
  }
}
