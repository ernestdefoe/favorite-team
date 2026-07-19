<?php

namespace Ernestdefoe\FavoriteTeam;

/**
 * Loads and indexes the bundled FBS team list (resources/teams.json). The list
 * is static reference data — team id, name, logo (ESPN CDN), color — so it is
 * parsed once per request and memoized.
 */
class TeamRepository
{
    protected ?array $teams = null;
    protected ?array $byId = null;

    /**
     * @return array<int, array{id:string,slug:string,name:string,shortName:string,abbreviation:string,color:?string,logo:string}>
     */
    public function all(): array
    {
        if ($this->teams === null) {
            // Bundled read-only reference data (not a storage disk). Read with
            // plain PHP file functions — NOT the Laravel File facade: facades are
            // not reliably bound in Flarum's container and throw "A facade root
            // has not been set" when hit during request boot (this runs while the
            // user API document is built). The existence guard degrades a missing
            // file to an empty list rather than throwing.
            $path = __DIR__ . '/../resources/teams.json';
            $json = file_exists($path) ? file_get_contents($path) : false;
            $data = $json !== false ? json_decode($json, true) : null;
            $this->teams = is_array($data) ? $data : [];
        }

        return $this->teams;
    }

    public function find(?string $id): ?array
    {
        if ($id === null || $id === '') {
            return null;
        }

        if ($this->byId === null) {
            $this->byId = [];
            foreach ($this->all() as $team) {
                $this->byId[(string) $team['id']] = $team;
            }
        }

        return $this->byId[$id] ?? null;
    }

    public function exists(?string $id): bool
    {
        return $this->find($id) !== null;
    }
}
