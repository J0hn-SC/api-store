import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY, PolicyHandler } from '../decorators/policies.decorator';
import { CaslAbilityFactory } from '../factories/casl-ability.factory';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    const req = context.getType<string>() === 'graphql' 
      ? GqlExecutionContext.create(context).getContext().req 
      : context.switchToHttp().getRequest();
    const user = req?.user;

    if (!user) return false;

    const ability = this.abilityFactory.createForUser(user);

    return handlers.every(handler => handler(ability));
  }
}