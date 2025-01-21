import { GrantApplication } from "@/types/api-types";
import { createContext } from "react";

export const ApplicationContext = createContext<GrantApplication | null>(null);
