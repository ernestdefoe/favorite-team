<?php

namespace Ernestdefoe\FavoriteTeam\Access;

use Flarum\Discussion\Discussion;
use Flarum\User\Access\AbstractPolicy;
use Flarum\User\User;

/**
 * Discussion policy: a member without a required team can't reply.
 */
class DiscussionPolicy extends AbstractPolicy
{
    public function __construct(protected TeamRequirement $requirement)
    {
    }

    public function reply(User $actor, Discussion $discussion): ?string
    {
        return $this->requirement->blocks($actor) ? $this->deny() : null;
    }
}
