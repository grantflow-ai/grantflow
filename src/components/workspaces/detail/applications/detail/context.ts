import { createContext } from "react";
import { Application } from "@/types/api-types";

export const ApplicationContext = createContext<Application | null>(null);
