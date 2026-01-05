import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group\";
import { CircleIcon } from "lucide-react\";

import { cn } from "./utils";

const RadioGroup = React.forwardRef(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    data-slot="radio-group"
    className={cn("flex flex-col gap-3", className)}
    {...props}
    ref={ref}
  />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    data-slot="radio-group-item"
    ref={ref}
    className={cn(
      "border-primary text-primary focus-visible:ring-ring aspect-square h-4 w-4 rounded-full border-2 outline-hidden ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <CircleIcon className="h-2.5 w-2.5 fill-current text-current" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
