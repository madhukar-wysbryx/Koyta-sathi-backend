import { IsString, IsNumber, Min, IsDateString, IsIn, IsOptional } from 'class-validator';

export class AddLedgerEntryDto {
  @IsIn(['taken', 'repaid'])
  type: 'taken' | 'repaid';

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsDateString()
  date: string;
}