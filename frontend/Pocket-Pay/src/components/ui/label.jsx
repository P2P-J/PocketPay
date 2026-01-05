import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label\";
import { cva } from "class-variance-authority\";

import { cn } from "./utils";

const labelVariants = cva(
  "text-foreground text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
);

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    data-slot="label"
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = "Label";

export { Label, labelVariants };
