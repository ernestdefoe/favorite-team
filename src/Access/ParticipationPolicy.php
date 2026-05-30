<?php

namespace Ernestdefoe\FavoriteTeam\Access;

use Ernestdefoe\FavoriteTeam\Api\UserResourceFields;
use Flarum\Discussion\Discussion;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\Access\AbstractPolicy;
use Flarum\User\User;

/**
 * Server-side enforcement of the "pick a team first" requirement. The JS modal
 * only nudges the user; this makes the requirement real — when the admin
 * setting is on, a registered user who hasn't chosen a favorite team is denied
 * `startDiscussion` and `reply`, so even a direct API write is rejected (and the
 * composer/reply controls hide, since the frontend reads the same abilities).
 *
 * Reading, logging in and setting the team are all unaffected, so a user is
 * never locked out of actually choosing their team.
 */
class ParticipationPolicy extends AbstractPolicy
{
    public function __construct(
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function startDiscussion(User $actor): ?string
    {
        return $this->lacksRequiredTeam($actor) ? $this->deny() : null;
    }

    public function reply(User $actor, Discussion $discussion): ?string
    {
        return $this->lacksRequiredTeam($actor) ? $this->deny() : null;
    }

    protected function lacksRequiredTeam(User $actor): bool
    {
        if (! $actor->exists) {
            return false;
        }
        if (! (bool) $this->settings->get('ernestdefoe-favorite-team.require_at_registration')) {
            return false;
        }
        return ! $actor->getPreference(UserResourceFields::PREF_KEY);
    }
}
