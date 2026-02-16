import { SetMetadata } from '@nestjs/common';
import { AppAbility } from '../interfaces/casl.types';
export type PolicyHandler =
  | ((ability: AppAbility) => boolean);

export const CHECK_POLICIES_KEY = 'check_policy';

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);