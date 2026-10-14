import { applyDecorators } from '@nestjs/common';
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt only considers the first 72 bytes of the input. */
export const PASSWORD_MAX_LENGTH = 72;

/** Platform password policy: 8–72 chars with uppercase, lowercase and a digit. */
export function IsPasswordPolicy(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH),
    MaxLength(PASSWORD_MAX_LENGTH),
    Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
      message: '$property must contain uppercase, lowercase and a number',
    }),
  );
}

/** Requires the decorated property to be equal to `property` (e.g. password confirmation). */
export function MatchesProperty(property: string, options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'matchesProperty',
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [property],
      options: { message: `$property must match ${property}`, ...options },
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [related] = args.constraints as [string];
          return value === (args.object as Record<string, unknown>)[related];
        },
      },
    });
  };
}
