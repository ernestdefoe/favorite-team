<?php

namespace Ernestdefoe\FavoriteTeam\Access;

use Ernestdefoe\FavoriteTeam\Api\UserResourceFields;
use Ernestdefoe\FavoriteTeam\TeamRepository;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;

/**
 * Server-side "pick a team first" check, shared by the two policies. The JS
 * modal only nudges the user; this makes the requirement real: when the admin
 * setting is on, a registered user without a favorite team is denied
 * `startDiscussion` and `reply`, so even a direct API write is rejected (and
 * the composer/reply controls hide, since the frontend reads the same
 * abilities). Reading, logging in and setting the team are unaffected.
 */
class TeamRequirement
{
    public const SKIP_PERMISSION = 'ernestdefoe-favorite-team.skipRequirement';

    public function __construct(
        protected SettingsRepositoryInterface $settings,
        protected TeamRepository $teams
    ) {
    }

    public function blocks(User $actor): bool
    {
        if (! $actor->exists) {
            return false;
        }
        if (! (bool) $this->settings->get('ernestdefoe-favorite-team.require_at_registration')) {
            return false;
        }

        // Accounts allowed to skip it: a forum's AI assistant or game-thread
        // bot has no team and should not have one, and without this every
        // reply it posts through the API is refused.
        if ($actor->hasPermission(self::SKIP_PERMISSION)) {
            return false;
        }

        // A team on the list, not just any value: core lets a member write
        // their own preferences directly, past favoriteTeamId's validation.
        return ! $this->teams->exists($actor->getPreference(UserResourceFields::PREF_KEY));
    }
}
