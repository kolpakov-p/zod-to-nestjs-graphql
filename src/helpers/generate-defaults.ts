import { AnyZodObject, ZodDefault, ZodObject, ZodTypeAny } from "zod";
import { isZodInstance } from "./is-zod-instance";

const generateDefaultsForObject = (
  input: AnyZodObject,
): Record<string, ZodTypeAny> =>
  Object.keys(input.shape).reduce(
    (curr, key) => {
      const res = generateDefaults<ZodTypeAny>(input.shape[key]);
      if (res) {
        curr[key] = res;
      }

      return curr;
    },
    {} as Record<string, ZodTypeAny>,
  );

export const generateDefaults = <T extends ZodTypeAny>(input: T): any => {
  if (isZodInstance(ZodObject, input)) {
    return generateDefaultsForObject(input as AnyZodObject);
  } else if (isZodInstance(ZodDefault, input)) {
    return input._def.defaultValue?.();
  }
};
