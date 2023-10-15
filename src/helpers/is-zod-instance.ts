import type { ZodTypeAny } from "zod";
import type { Type } from "@nestjs/common";

export function isZodInstance<T extends Type<ZodTypeAny>>(
  type: T,
  instance: object,
): instance is InstanceType<T> {
  return type.name === instance.constructor.name;
}
