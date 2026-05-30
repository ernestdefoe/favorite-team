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
            $path = __DIR__ . '/../resources/teams.json';
            $json = is_readable($path) ? file_get_contents($path) : false;
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
