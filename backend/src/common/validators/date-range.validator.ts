import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that the decorated "YYYY-MM" string property is not chronologically
 * before another "YYYY-MM" string property on the same object.
 *
 * Because both values are always zero-padded "YYYY-MM" strings, a plain
 * lexicographic string comparison is equivalent to a chronological comparison.
 *
 * Skips validation (returns true) when either value is missing, so it composes
 * cleanly with @IsOptional()/@ValidateIf() on either field.
 */
export function IsAfterOrEqualMonth(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterOrEqualMonth',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          if (typeof value !== 'string' || !value) return true;
          if (typeof relatedValue !== 'string' || !relatedValue) return true;
          return value >= relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          return `${args.property} cannot be earlier than ${relatedPropertyName}`;
        },
      },
    });
  };
}