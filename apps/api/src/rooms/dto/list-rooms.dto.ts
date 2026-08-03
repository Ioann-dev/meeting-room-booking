import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ListRoomsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minCapacity must be a whole number' })
  @Min(1, { message: 'minCapacity must be at least 1' })
  minCapacity?: number;
}
