import { RootRoute, Route, Router } from '@tanstack/react-router';
import RootLayout from '../pages/RootLayout';
import Dashboard from '../pages/Dashboard';
import Transactions from '../pages/Transactions';
import Budgets from '../pages/Budgets';
import Settings from '../pages/Settings';

const rootRoute = new RootRoute({
  component: RootLayout,
});

const dashboardRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

const transactionsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  component: Transactions,
});

const budgetsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/budgets',
  component: Budgets,
});

const settingsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  transactionsRoute,
  budgetsRoute,
  settingsRoute,
]);

export const router = new Router({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
