import { InferSubjects, PureAbility } from '@casl/ability';
import { User, Product, PromoCode, Order, ProductLike, Cart } from '@prisma/client';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Purchase = 'purchase',
  Cancel = 'cancel',
}

export type Subjects = 
  | 'all' 
  | 'User' 
  | 'Product' 
  | 'Order' 
  | 'PromoCode' 
  | 'Like' 
  | 'Cart' 
  | InferSubjects<User | Product | Order | PromoCode | ProductLike | Cart>;

export type AppAbility = PureAbility<[Action, Subjects]>;