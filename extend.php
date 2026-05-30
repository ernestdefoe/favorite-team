<?php

use Ernestdefoe\FavoriteTeam\Api\Controller\ListTeamsController;
use Ernestdefoe\FavoriteTeam\Api\UserResourceFields;
use Flarum\Api\Resource\UserResource;
use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\Routes('api'))
        ->get('/fbs-teams', 'ernestdefoe-favorite-team.teams', ListTeamsController::class),

    // Favorite team is stored as a user preference so it loads with the user
    // row (no extra query when rendering the badge on a page of posts).
    (new Extend\User())
        ->registerPreference(UserResourceFields::PREF_KEY, 'strval', null),

    (new Extend\ApiResource(UserResource::class))
        ->fields(UserResourceFields::class),

    // Exposed to the forum so the registration gate knows whether to block.
    (new Extend\Settings())
        ->serializeToForum('ernestdefoe-favorite-team.requireAtRegistration', 'ernestdefoe-favorite-team.require_at_registration', 'boolval', false),
];
