<?php

namespace Ernestdefoe\FavoriteTeam\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Group\Group;
use Flarum\Post\Post;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

class FavoriteTeamTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private const PREF = 'ernestdefoe-favorite-team.team';

    // Alabama, from the bundled list.
    private const TEAM = '333';

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-favorite-team');

        $this->prepareDatabase([
            User::class => [
                $this->normalUser(),
                ['id' => 3, 'username' => 'fan', 'email' => 'fan@machine.local', 'is_email_confirmed' => 1, 'preferences' => json_encode([self::PREF => self::TEAM])],
                ['id' => 4, 'username' => 'bot', 'email' => 'bot@machine.local', 'is_email_confirmed' => 1],
            ],
            Group::class => [['id' => 10, 'name_singular' => 'Bot', 'name_plural' => 'Bots']],
            'group_user' => [['user_id' => 4, 'group_id' => 10]],
            'group_permission' => [
                ['group_id' => 10, 'permission' => 'ernestdefoe-favorite-team.skipRequirement'],
                // Several posts in one test would otherwise trip flood control.
                ['group_id' => Group::MEMBER_ID, 'permission' => 'postWithoutThrottle'],
            ],
            Discussion::class => [
                ['id' => 1, 'title' => 'Game day', 'created_at' => Carbon::now(), 'user_id' => 1, 'first_post_id' => 1, 'comment_count' => 1, 'last_post_number' => 1],
            ],
            Post::class => [
                ['id' => 1, 'discussion_id' => 1, 'number' => 1, 'created_at' => Carbon::now(), 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>Kickoff</p></t>'],
            ],
        ]);
    }

    private function json(string $method, string $path, ?int $actor = null, ?array $body = null): array
    {
        $options = $actor ? ['authenticatedAs' => $actor] : [];
        if ($body !== null) {
            $options['json'] = $body;
        }

        $response = $this->send($this->request($method, $path, $options));

        return [$response->getStatusCode(), json_decode((string) $response->getBody(), true)];
    }

    private function setTeam(int $userId, ?string $team, int $actor): int
    {
        [$status] = $this->json('PATCH', "/api/users/$userId", $actor, ['data' => [
            'type' => 'users', 'id' => (string) $userId, 'attributes' => ['favoriteTeamId' => $team],
        ]]);

        return $status;
    }

    private function storedTeam(int $userId): ?string
    {
        return json_decode((string) $this->database()->table('users')->where('id', $userId)->value('preferences'), true)[self::PREF] ?? null;
    }

    private function reply(int $actor): int
    {
        [$status] = $this->json('POST', '/api/posts', $actor, ['data' => [
            'type' => 'posts',
            'attributes' => ['content' => 'Roll Tide'],
            'relationships' => ['discussion' => ['data' => ['type' => 'discussions', 'id' => '1']]],
        ]]);

        return $status;
    }

    private function startDiscussion(int $actor): int
    {
        [$status] = $this->json('POST', '/api/discussions', $actor, ['data' => [
            'type' => 'discussions',
            'attributes' => ['title' => 'Rivalry week', 'content' => 'Who wins?'],
        ]]);

        return $status;
    }

    #[Test]
    public function the_team_list_is_for_signed_in_members()
    {
        [$status] = $this->json('GET', '/api/fbs-teams');
        $this->assertSame(401, $status);

        [$status, $body] = $this->json('GET', '/api/fbs-teams', 2);
        $this->assertSame(200, $status);
        $this->assertGreaterThan(100, count($body['data']));
        $this->assertContains(self::TEAM, array_column($body['data'], 'id'));
    }

    #[Test]
    public function a_member_picks_their_own_team_and_an_unknown_one_is_refused()
    {
        $this->assertSame(200, $this->setTeam(2, self::TEAM, 2));
        $this->assertSame(self::TEAM, $this->storedTeam(2));

        $this->assertSame(422, $this->setTeam(2, 'not-a-team', 2));
        $this->assertSame(self::TEAM, $this->storedTeam(2));

        $this->assertSame(200, $this->setTeam(2, null, 2));
        [, $body] = $this->json('GET', '/api/users/2', 2);
        $this->assertNull($body['data']['attributes']['favoriteTeamId']);
        $this->assertNull($body['data']['attributes']['favoriteTeam']);
    }

    #[Test]
    public function nobody_else_but_an_admin_can_change_it()
    {
        $this->setTeam(3, '2005', 2);
        $this->assertSame(self::TEAM, $this->storedTeam(3), 'Another member cannot change it');

        $this->assertSame(200, $this->setTeam(3, '2005', 1));
        $this->assertSame('2005', $this->storedTeam(3));
    }

    #[Test]
    public function everyone_sees_the_crest_but_only_the_owner_sees_the_raw_id()
    {
        [$status, $body] = $this->json('GET', '/api/users/3', 2);
        $this->assertSame(200, $status);
        $attributes = $body['data']['attributes'];

        $this->assertSame(self::TEAM, $attributes['favoriteTeam']['id']);
        $this->assertSame('Alabama Crimson Tide', $attributes['favoriteTeam']['name']);
        $this->assertStringStartsWith('https://', $attributes['favoriteTeam']['logo']);
        $this->assertContains($attributes['favoriteTeam']['crestHalo'], ['light', 'dark']);
        $this->assertArrayNotHasKey('favoriteTeamId', $attributes);

        [, $body] = $this->json('GET', '/api/users/3', 3);
        $this->assertSame(self::TEAM, $body['data']['attributes']['favoriteTeamId']);

        [, $body] = $this->json('GET', '/api/users/2', 2);
        $this->assertNull($body['data']['attributes']['favoriteTeam']);
    }

    #[Test]
    public function without_the_requirement_anyone_may_post()
    {
        $this->assertSame(201, $this->reply(2));
        $this->assertSame(201, $this->startDiscussion(2));
    }

    #[Test]
    public function with_the_requirement_a_member_without_a_team_cannot_post()
    {
        $this->setting('ernestdefoe-favorite-team.require_at_registration', '1');

        [, $body] = $this->json('GET', '/api');
        $this->assertTrue($body['data']['attributes']['ernestdefoe-favorite-team.requireAtRegistration']);

        $this->assertSame(403, $this->reply(2));
        $this->assertSame(403, $this->startDiscussion(2));

        // A member with a team, and an account allowed to skip it, may.
        $this->assertSame(201, $this->reply(3));
        $this->assertSame(201, $this->startDiscussion(3));
        $this->assertSame(201, $this->reply(4));

        // Choosing a team is never locked behind the requirement.
        $this->assertSame(200, $this->setTeam(2, self::TEAM, 2));
        $this->assertSame(201, $this->reply(2));
    }

    #[Test]
    public function the_requirement_is_not_met_by_writing_a_junk_preference_directly()
    {
        $this->setting('ernestdefoe-favorite-team.require_at_registration', '1');

        // Core lets a member write their own preferences, which skips the
        // favoriteTeamId validation.
        [$status] = $this->json('PATCH', '/api/users/2', 2, ['data' => [
            'type' => 'users', 'id' => '2', 'attributes' => ['preferences' => [self::PREF => 'anything']],
        ]]);
        $this->assertSame(200, $status);
        $this->assertSame('anything', $this->storedTeam(2));

        $this->assertSame(403, $this->reply(2));
    }

    #[Test]
    public function a_page_of_fans_is_not_a_query_per_user()
    {
        $users = [];
        for ($id = 10; $id < 20; $id++) {
            $users[] = ['id' => $id, 'username' => "fan$id", 'email' => "fan$id@machine.local", 'is_email_confirmed' => 1, 'preferences' => json_encode([self::PREF => self::TEAM])];
        }
        $this->prepareDatabase([User::class => $users]);

        [$status, $body] = $this->json('GET', '/api/users', 1);
        $this->assertSame(200, $status);
        // The ten, and the fan from setUp.
        $this->assertCount(11, array_filter($body['data'], fn ($u) => ($u['attributes']['favoriteTeam']['id'] ?? null) === self::TEAM));
    }
}
