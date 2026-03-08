import { createContext, useContext } from 'react';

export interface HashRouterConfig {
    enabled?: boolean;
    basename?: string;
}

export interface ClientConfig {
    hashRouter?: HashRouterConfig;
    [key: string]: any;
}

export const ClientConfigContext = createContext<ClientConfig>({});
export const ClientConfigProvider = ClientConfigContext.Provider;

export function useClientConfig() {
    return useContext(ClientConfigContext);
}
