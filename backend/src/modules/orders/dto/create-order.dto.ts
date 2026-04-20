import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum OrderType {
  SERVICE = 'service',
  SELF_SERVICE = 'self_service',
}

export class CreateOrderDto {
  @IsEnum(OrderType)
  @IsNotEmpty()
  type: OrderType;

  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsOptional()
  bike_id?: string;

  @IsString()
  @IsOptional()
  booking_id?: string;

  @IsString()
  @IsOptional()
  mechanic_id?: string;

  @IsString()
  @IsOptional()
  problem_description?: string;
}
