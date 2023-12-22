import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";
import { AnyZodObject, TypeOf, ZodObject, ZodOptional, ZodTypeAny } from "zod";
import { generateClassFromZod, parseShape } from "../parser";
import { isZodInstance } from "./is-zod-instance";

export const preregisterNested = <T extends AnyZodObject>(
  input: T,
  rootClassType: ClassType,
  parentKeyName = "",
) => {
  // TODO: Skip already registered.

  for (const [key, value] of Object.entries<ZodTypeAny>(input.shape)) {
    if (isZodInstance(ZodObject, value)) {
      // @ts-ignore
      preregisterNested(value, rootClassType, `${parentKeyName}${key}`);

      generateClassFromZod(
        // @ts-ignore
        value,
        {
          name: `${parentKeyName}${key}`,
        },
        rootClassType,
      );
    }

    if (
      value._def?.innerType &&
      isZodInstance(ZodObject, value._def.innerType)
    ) {
      console.log(key, value._def.innerType);

      // @ts-ignore
      preregisterNested(
        value._def.innerType,
        rootClassType,
        `${parentKeyName}${key}`,
      );

      generateClassFromZod(
        value._def.innerType,
        {
          name: `${parentKeyName}${key}`,
        },
        rootClassType,
      );
    }
  }
};
