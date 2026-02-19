import { Field, InputType } from "@nestjs/graphql";
import { OrderStatus } from "@prisma/client";

@InputType()
export class OrderFilterInput {
    @Field({ nullable: true }) 
    status?: OrderStatus;

    @Field({ nullable: true }) 
    fromDate?: Date;

    @Field({ nullable: true }) 
    toDate?: Date;

    @Field({ nullable: true }) 
    minTotal?: number;
    
    @Field({ nullable: true }) 
    maxTotal?: number;
}
