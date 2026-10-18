import { ValidationArguments, ValidationOptions, ValidatorConstraintInterface } from "class-validator";
export declare function IsDateNotGreaterThen(Field: string, validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare class DateNotGreaterThenValidation implements ValidatorConstraintInterface {
    validate(start_date: string, args: ValidationArguments): Promise<boolean>;
}
