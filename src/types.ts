import { BaseTypeOptions } from "@nestjs/graphql";
import { AnyZodObject, ZodTypeAny } from "zod";

export type TypeRegistrationExtraOptions = {
  additionalRegistrations?: Array<
    TypeMetadata & {
      type: AnyZodObject;
    }
  >;
  hotReplacements?: Array<{
    origin: ZodTypeAny;
    replacement: ZodTypeAny;
  }>;
};

export type TypeMetadata = {
  name: string;
  description?: string;
};

/**
 * An interface describing a parsed field.
 */
export type ParsedField = BaseTypeOptions<any> & {
  /**
   * The key of the parsed property.
   *
   * @type {string}
   */
  key: string;

  /**
   * The type of the field of the parsed property.
   *
   * Can be used for GraphQL @{@link Field} decorator.
   *
   * @type {*}
   */
  fieldType: any;

  description?: string;
};

/**
 * Describes the properties of a zod type that can be used to apply to `Field`
 * decorator of NestJS.
 *
 * @export
 * @interface ZodTypeInfo
 */
export interface ZodTypeInfo {
  /**
   * The corresponing type of the `zod` property.
   *
   * This type will be used by the `Field` property of the NestJS decorators.
   *
   * @type {*}
   * @memberof ZodTypeInfo
   */
  type: any;

  /**
   * Indicates whether or not the prperty is optional.
   *
   * @type {boolean}
   * @memberof ZodTypeInfo
   */
  isOptional: boolean;

  /**
   * Indicates whether or not the property is nullable.
   *
   * @type {boolean}
   * @memberof ZodTypeInfo
   */
  isNullable: boolean;

  /**
   * Indicates whether or not the property is an enum type.
   *
   * @type {boolean}
   * @memberof ZodTypeInfo
   */
  isEnum?: boolean;

  /**
   * Indicates whether or not the property is an object (another type).
   *
   * @type {boolean}
   * @memberof ZodTypeInfo
   */
  isType?: boolean;

  /**
   * Indicates whether or not the property is an array.
   *
   * @type {boolean}
   * @memberof ZodTypeInfo
   */
  isOfArray?: boolean;

  /**
   * Indicates whether or not the item of the array of the property is
   * optional.
   *
   * @type {boolean}
   * @memberof ZodTypeInfo
   */
  isItemOptional?: boolean;

  /**
   * Indicates whether or not the item of the array of the property is
   * nullable.
   *
   * @type {boolean}
   * @memberof ZodTypeInfo
   */
  isItemNullable?: boolean;

  description?: string;
}
