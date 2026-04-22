import { IsArray, IsNumber, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateSaleDto {
  @IsArray()
  items: any[];

  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @IsOptional()
  @IsNumber()
  total?: number;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  discount?: string;

  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;
  
  @IsOptional()
  @IsObject()
  cashier?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}
