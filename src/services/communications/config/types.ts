import type { EventType } from '@/types/communications';

export interface TemplateDefinition {
  /** Must exactly match a template name approved in Meta Business Manager. */
  name: string;
  /** Ordered list of parameter keys -> must match the template's {{1}}, {{2}}... order. */
  parameterOrder: string[];
}
