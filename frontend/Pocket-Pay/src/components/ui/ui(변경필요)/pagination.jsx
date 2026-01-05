"use client";

import * as React from "react";
import * as PaginationPrimitive from "@radix-ui/react-pagination@1.1.2";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react@0.487.0";

import { buttonVariants } from "./button";
import { cn } from "./utils";

function Pagination({ className, ...props }) {
  return (
    <nav
      data-slot="pagination"
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }) {
  return (
    <PaginationPrimitive.Root
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem(props) {
  return <li data-slot="pagination-item" {...props} />;
}

const PaginationPrevious = React.forwardRef(({ className, ...props }, ref) => (
  <PaginationPrimitive.Previous
    data-slot="pagination-previous"
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "gap-1 pr-2.5",
      className
    )}
    {...props}
  >
    <ChevronLeftIcon className="h-4 w-4" />
    <span>Previous</span>
  </PaginationPrimitive.Previous>
));
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = React.forwardRef(({ className, ...props }, ref) => (
  <PaginationPrimitive.Next
    data-slot="pagination-next"
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "gap-1 pl-2.5",
      className
    )}
    {...props}
  >
    <span>Next</span>
    <ChevronRightIcon className="h-4 w-4" />
  </PaginationPrimitive.Next>
));
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }) => (
  <span
    data-slot="pagination-ellipsis"
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontalIcon className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

const PaginationLink = React.forwardRef(
  ({ className, isActive, size = "icon", ...props }, ref) => (
    <PaginationPrimitive.Link
      data-slot="pagination-link"
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({
          variant: isActive ? "default" : "outline",
          size,
        }),
        className
      )}
      {...props}
    />
  )
);
PaginationLink.displayName = "PaginationLink";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
