import { createContext, useContext } from 'react'

export interface RouteApiContextValue<NavigationFunction> {
  navigate: NavigationFunction
}

export interface RouteApiContextFactoryOptions<NavigationFunction> {
  navigate: NavigationFunction
}

export function routeApiContextFactory<NavigationFunction = (to: string) => void>() {
  const RouteApiContext = createContext<RouteApiContextValue<NavigationFunction> | undefined>(
    undefined
  )

  function Provider({
    children,
    ...routeApi
  }: React.PropsWithChildren<RouteApiContextFactoryOptions<NavigationFunction>>) {
    return <RouteApiContext.Provider value={routeApi}>{children}</RouteApiContext.Provider>
  }

  function useRouteApi() {
    const value = useContext(RouteApiContext)
    if (!value) {
      throw new Error('useRouteApi must be used within a RouteApiContext.Provider')
    }
    return value
  }

  return { Provider, useRouteApi }
}

export type ExtractNavigationFunction<ApiContextReturn> = ApiContextReturn extends {
  useRouteApi: () => RouteApiContextValue<infer NavigationFunction>
}
  ? {
      navigate: NavigationFunction
    }
  : never
