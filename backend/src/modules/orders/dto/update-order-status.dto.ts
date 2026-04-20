import { IsEnum, IsNotEmpty } from 'class-validator';

export enum OrderStatus {
  NEW = 'new',
  DIAGNOSING = 'diagnosing',
  WAITING_PARTS = 'waiting_parts',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAID = 'paid',
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}
