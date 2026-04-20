import { IsArray, IsNumber, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateSaleDto {
  @IsArray()
  items: any[];

  @IsNumber()
  total_amount: number;

  @IsString()
  payment_method: string;

  @IsOptional()
  @IsString()
  discount?: string;

  @IsOptional()
  @IsString()
  customer?: string;
  
  @IsOptional()
  @IsObject()
  cashier?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}
