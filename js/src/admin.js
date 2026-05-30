import app from 'flarum/admin/app';
import { Admin } from 'flarum/common/extenders';

export default [
  new Admin().setting(() => ({
    setting: 'ernestdefoe-favorite-team.require_at_registration',
    type: 'boolean',
    label: app.translator.trans('ernestdefoe-favorite-team.admin.require_at_registration_label'),
    help: app.translator.trans('ernestdefoe-favorite-team.admin.require_at_registration_help'),
  })),
];
