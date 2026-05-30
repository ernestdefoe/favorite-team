<?php

namespace Ernestdefoe\FavoriteTeam\Api\Controller;

use Ernestdefoe\FavoriteTeam\TeamRepository;
use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Returns the full FBS team list for the picker grid. Static reference data,
 * so it's safe to cache hard on the client.
 */
class ListTeamsController implements RequestHandlerInterface
{
    public function __construct(protected TeamRepository $teams)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertRegistered();

        return new JsonResponse(['data' => $this->teams->all()]);
    }
}
