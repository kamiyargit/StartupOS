"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  src: string;
  className?: string;
  size?: number;
};

export function AppLogo({ src, className, size = 28 }: AppLogoProps) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      unoptimized
    />
  );
}
