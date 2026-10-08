<?php

namespace Ernestdefoe\FavoriteTeam\Api;

use Ernestdefoe\FavoriteTeam\TeamRepository;
use Flarum\Api\Context;
use Flarum\Api\Schema;
use Flarum\Foundation\ValidationException;
use Flarum\User\User;

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
                        // 🚨 The crest the WEDGE uses, which is not always the
                        // crest shown elsewhere. Measured per team against that
                        // team's own colour: 88 of 136 read better as ESPN's
                        // 500-dark variant, and Alabama's is the white script A.
                        'wedgeLogo'    => $team['wedgeLogo'] ?? $team['logo'],
                        // 'light' or 'dark' — the outline that separates this
                        // crest from its own club colour. 30 teams have no
                        // variant that contrasts with their wedge at all, so
                        // the outline is what rescues them.
                        'crestHalo'    => $team['crestHalo'] ?? 'dark',
                    ];
                }),
        ];
    }

    protected function isSelfOrAdmin(User $user, Context $c): bool
    {
        $actor = $c->getActor();

        return $actor->exists && ((int) $actor->id === (int) $user->id || $actor->isAdmin());
    }
}
