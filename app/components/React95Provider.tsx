"use client";

import React from "react";
import { ThemeProvider } from "styled-components";
import tokyoDark from "react95/dist/themes/original";

export default function React95Provider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={tokyoDark}>{children}</ThemeProvider>;
}
