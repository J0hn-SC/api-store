import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }
    async canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);

        try {
            await super.canActivate(context);
            return true; 
        } catch (error) {
            if (isPublic) return true;
            throw error;
        }
    }

    getRequest(context: ExecutionContext) {
        // REST
        if (context.getType() === 'http') {
            return context.switchToHttp().getRequest();
        }

        // GraphQL
        const ctx = GqlExecutionContext.create(context);
        return ctx.getContext().req;
    }
}