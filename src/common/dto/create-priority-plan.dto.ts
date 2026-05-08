import { IsString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PriorityItemDto {
  @IsString()
  itemName: string;

  @IsNumber()
  @Min(1)
  estimatedAmount: number;
}

export class CreatePriorityPlanDto {
  @IsString()
  seasonYear: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriorityItemDto)
  items: PriorityItemDto[];
}