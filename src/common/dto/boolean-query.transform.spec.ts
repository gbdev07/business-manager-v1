import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ToOptionalBoolean } from './boolean-query.transform';

class Query {
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  isActive?: boolean;
}

function parse(value: unknown) {
  return plainToInstance(Query, { isActive: value }, { enableImplicitConversion: true }).isActive;
}

describe('ToOptionalBoolean', () => {
  it('keeps the query string false as false', () => {
    expect(parse('false')).toBe(false);
  });

  it('keeps the query string true as true', () => {
    expect(parse('true')).toBe(true);
  });

  it('leaves an absent filter unset', () => {
    expect(parse(undefined)).toBeUndefined();
    expect(parse('')).toBeUndefined();
  });
});
