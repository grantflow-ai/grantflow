import { Application } from "@/types/api-types";
import { createContext } from "react";

export const ApplicationContext = createContext<Application | null>(null);
