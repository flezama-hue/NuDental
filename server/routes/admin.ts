import type { Express, RequestHandler } from 'express';
import type { Database } from '../db.js';
import { registerCasesFinanceRoutes } from './cases-finance.js';
import { registerInventoryPurchasesRoutes } from './inventory-purchases.js';
import { registerLogisticsIntegrationRoutes } from './logistics-integration.js';

export function registerAdminRoutes(app: Express, db: Database, middleware: { authenticated: RequestHandler; laboratory: RequestHandler; manager: RequestHandler }) {
  registerCasesFinanceRoutes(app, db, middleware);
  registerInventoryPurchasesRoutes(app, db, middleware);
  registerLogisticsIntegrationRoutes(app, db, middleware);
}
