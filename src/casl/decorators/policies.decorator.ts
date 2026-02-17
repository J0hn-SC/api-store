import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AppAbility } from '../interfaces/casl.types';
import { PoliciesGuard } from '../guards/casl.guard';

export type PolicyHandler =
  | ((ability: AppAbility) => boolean);

export const CHECK_POLICIES_KEY = 'check_policy';

export const CheckPolicies = (...handlers: PolicyHandler[]) => {
  return applyDecorators(
    SetMetadata(CHECK_POLICIES_KEY, handlers),
    UseGuards(PoliciesGuard)
  )
}