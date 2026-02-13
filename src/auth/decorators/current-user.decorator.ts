import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    // REST
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.user;
    }

    // GraphQL
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);