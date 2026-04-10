import {
  IsString,
  IsUrl,
  IsOptional,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CredentialsDto {
  @IsString()
  @ApiProperty()
  username: string;

  @IsString()
  @ApiProperty()
  password: string;
}

export class TestRequestDto {
  @IsUrl({}, { message: 'Provide a valid URL (include https://)' })
  @ApiProperty()
  url: string;

  @IsString()
  @ApiProperty()
  testContext: string;
  // Examples:
  //   "Perform login smoke test"
  //   "Test the contact form validation"
  //   "Verify navigation links work correctly"
  //   "Test the checkout flow end-to-end"

  @IsOptional()
  @IsIn(['chromium', 'firefox', 'webkit'])
  @ApiProperty({
    enum: ['chromium', 'firefox', 'webkit'],
    required: false,
  })

  browser?: 'chromium' | 'firefox' | 'webkit';

  @IsOptional()
  @ValidateNested()
  @ApiProperty()
  @Type(() => CredentialsDto)
  credentials?: CredentialsDto;
}