<?php

namespace Ernestdefoe\FavoriteTeam\Access;

use Flarum\User\Access\AbstractPolicy;
use Flarum\User\User;

/**
 * Global policy: a member without a required team can't start a discussion.
 */
class StartDiscussionPolicy extends AbstractPolicy
{
    public function __construct(protected TeamRequirement $requirement)
    {
    }

    public function startDiscussion(User $actor): ?string
    {
        return $this->requirement->blocks($actor) ? $this->deny() : null;
    }
}
