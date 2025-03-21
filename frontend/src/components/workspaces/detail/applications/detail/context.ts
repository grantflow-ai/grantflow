import { API } from "@/types/api-types";
import { createContext } from "react";

export const ApplicationContext = createContext<API.GetApplication.Http200.ResponseBody | null>(null);
