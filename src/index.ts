import type { AnyZodObject, ZodNativeEnum } from "zod";
import { TypeMetadata } from "./types";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";
import { generateClassFromZod } from "./parser";
import { EnumOptions, registerEnumType } from "@nestjs/graphql";

export const generateObjectTypeFromZod = <T extends AnyZodObject>(
  input: T,
  metadata: TypeMetadata,
) => {
  return generateClassFromZod(input, metadata, ClassType.OBJECT);
};

export const generateInputTypeFromZod = <T extends AnyZodObject>(
  input: T,
  metadata: TypeMetadata,
) => {
  return generateClassFromZod(input, metadata, ClassType.INPUT);
};

export const registerZodEnumType = <T extends ZodNativeEnum<any>>(
  input: T,
  metadata: EnumOptions<T["enum"]>,
) => {
  registerEnumType(input.enum, metadata);
};
