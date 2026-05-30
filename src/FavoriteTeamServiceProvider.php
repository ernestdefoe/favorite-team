<?php

namespace Ernestdefoe\FavoriteTeam;

use Flarum\Foundation\AbstractServiceProvider;

/**
 * Binds TeamRepository as a container singleton so every injection point
 * (ListTeamsController, UserResourceFields, the policy) shares one instance —
 * and the bundled teams.json is read + decoded at most once per request rather
 * than per injection.
 */
class FavoriteTeamServiceProvider extends AbstractServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(TeamRepository::class);
    }
}
