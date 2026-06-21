<?php

namespace Ernestdefoe\FavoriteTeam;

use Illuminate\Support\Facades\File;

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
            // Bundled read-only reference data (not a storage disk), read via the
            // Laravel File facade with an existence guard so a missing file
            // degrades to an empty list rather than throwing.
            $path = __DIR__ . '/../resources/teams.json';
            $json = File::exists($path) ? File::get($path) : false;
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
