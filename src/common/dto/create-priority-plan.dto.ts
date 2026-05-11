import { IsString, IsArray, ValidateNested, IsNumber, IsOptional, Min } from 'class-validator';
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  priorityAdvanceAmount?: number;
}