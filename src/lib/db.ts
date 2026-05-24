import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { getJwtTenantId } from './tenant-scope';

const TENANT_MODELS = new Set([
  'User', 'Device', 'Session', 'InventoryItem', 'Order',
  'Sale', 'SaleItem', 'DeviceType', 'FinancialTransaction',
  'SessionSegment', 'Shift', 'AuditLog', 'TenantSettings',
]);

const tenantExtension = Prisma.defineExtension({
  name: 'tenant-isolation',
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            args.where = { ...(args.where || {}), tenantId };
          }
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            args.where = { ...(args.where || {}), tenantId };
          }
        }
        return query(args);
      },
      async findFirstOrThrow({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            args.where = { ...(args.where || {}), tenantId };
          }
        }
        return query(args);
      },
      async create({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            args.data = { ...(args.data as any), tenantId };
          }
        }
        return query(args);
      },
      async createMany({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: any) => ({ ...d, tenantId }));
            } else {
              (args.data as any).tenantId = tenantId;
            }
          }
        }
        return query(args);
      },
    },
  },
});

const db = prisma.$extends(tenantExtension);

export default db;
