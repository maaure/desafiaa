import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodType } from "zod";

export function zSchema(schema: ZodType) {
  return zodToJsonSchema(schema, { target: "openApi3" }) as Record<
    string,
    unknown
  >;
}
