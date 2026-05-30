<?php

namespace Ernestdefoe\FavoriteTeam\Api;

use Ernestdefoe\FavoriteTeam\TeamRepository;
use Flarum\Api\Context;
use Flarum\Api\Schema;
use Flarum\Foundation\ValidationException;

/**
 * Adds the user's favorite FBS team to the core UserResource.
 *
 *  - favoriteTeamId : the chosen team id. Writable by the user themselves (or
 *    an admin); stored in the user's preferences JSON so it travels with the
 *    user row — no extra query when rendering the badge on a page of posts.
 *  - favoriteTeam   : resolved {id,name,logo,...} for display, readable by
 *    everyone so the logo can render under the avatar wherever the user shows.
 */
class UserResourceFields
{
    public const PREF_KEY = 'ernestdefoe-favorite-team.team';

    public function __construct(protected TeamRepository $teams)
    {
    }

    public function __invoke(): array
    {
        return [
            Schema\Str::make('favoriteTeamId')
                ->nullable()
                ->visible(fn ($user, Context $c) => $this->isSelfOrAdmin($user, $c))
                ->writable(fn ($user, Context $c) => $this->isSelfOrAdmin($user, $c))
                ->get(fn ($user) => $user->getPreference(self::PREF_KEY) ?: null)
                ->set(function ($user, $value) {
                    if ($value === null || $value === '') {
                        $user->setPreference(self::PREF_KEY, null);

                        return;
                    }

                    $id = (string) $value;
                    if (! $this->teams->exists($id)) {
                        throw new ValidationException(['favoriteTeamId' => 'Unknown team.']);
                    }

                    $user->setPreference(self::PREF_KEY, $id);
                }),

            Schema\Arr::make('favoriteTeam')
                ->get(function ($user) {
                    $team = $this->teams->find($user->getPreference(self::PREF_KEY) ?: null);
                    if ($team === null) {
                        return null;
                    }

                    return [
                        'id'           => $team['id'],
                        'name'         => $team['name'],
                        'shortName'    => $team['shortName'],
                        'abbreviation' => $team['abbreviation'],
                        'color'        => $team['color'] ?? null,
                        'logo'         => $team['logo'],
                    ];
                }),
        ];
    }

    protected function isSelfOrAdmin($user, Context $c): bool
    {
        $actor = $c->getActor();

        return $actor->exists && ((int) $actor->id === (int) $user->id || $actor->isAdmin());
    }
}
