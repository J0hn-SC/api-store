import { Injectable } from '@nestjs/common';
import { AbilityBuilder, PureAbility } from '@casl/ability';
import { Action, AppAbility } from '../interfaces/casl.types';
import { Role } from '@prisma/client';

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: any): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility as any);

    if (user.role === Role.MANAGER) {
        can(Action.Manage, 'Product');
        can(Action.Manage, 'PromoCode');

        can(Action.Read, 'Order');
        can(Action.Update, 'Order');
    }

    else if (user.role === Role.CLIENT) {
        
        can(Action.Read, 'Product', { isActive: true });
        can(Action.Purchase, 'Product');

        can(Action.Manage, 'Like', { userId: user.id });

        can(Action.Manage, 'Cart', { userId: user.id });

        can(Action.Create, 'Order');
        can(Action.Read, 'Order', { userId: user.id });
        can(Action.Cancel, 'Order', { 
            userId: user.id, 
            status: { $in: ['pending', 'paid', 'processing'] } 
        });

        can(Action.Read, 'PromoCode');
    }

    if (user.role === Role.DELIVERY) {
        can(Action.Read, 'Order', { status: 'shipped' });
        can(Action.Update, 'Order', { status: 'shipped' });
    }

    return build({
        detectSubjectType: (item) => item.constructor?.name || (item as any).__typename,
    });
  }
}