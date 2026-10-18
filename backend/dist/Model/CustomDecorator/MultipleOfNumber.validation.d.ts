import { ValidationArguments, ValidationOptions, ValidatorConstraintInterface } from "class-validator";
export declare function IsMultipleOfNumber(Field: number, validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare class MultipleOfNumberThenValidation implements ValidatorConstraintInterface {
    validate(numb: number, args: ValidationArguments): Promise<boolean>;
}
