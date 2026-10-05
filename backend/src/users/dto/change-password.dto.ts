import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

function IsSameAsPassword(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSameAsPassword',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const dto = args.object as Record<string, unknown>;
          return value === dto[property];
        },
        defaultMessage: () => 'New password and confirm password do not match',
      },
    });
  };
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  @MaxLength(128)
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MaxLength(72, { message: 'Password must be 72 characters or fewer' })
  newPassword: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  @IsString()
  @IsSameAsPassword('newPassword')
  confirmNewPassword: string;
}