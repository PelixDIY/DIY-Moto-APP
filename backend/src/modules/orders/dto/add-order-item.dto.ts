import { IsString, IsNotEmpty, IsEnum, IsNumber, Min } from 'class-validator';

export enum OrderItemType {
  SERVICE = 'service',
  PART = 'part',
}

export class AddOrderItemDto {
  @IsEnum(OrderItemType)
  @IsNotEmpty()
  type: OrderItemType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  item_id: string; // Internal inventory or service catalog ID

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number; // Price charged to the client per unit

  @IsNumber()
  @Min(0)
  cost: number; // Internal cost per unit
}
