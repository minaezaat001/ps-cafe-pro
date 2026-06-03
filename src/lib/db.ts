import { Prisma } from '@prisma/client';
import basePrisma from './prisma';
import { getJwtTenantId } from './tenant-scope';

const TENANT_MODELS = new Set([
  'User', 'Device', 'Session', 'InventoryItem', 'Order',
  'Sale', 'SaleItem', 'DeviceType', 'FinancialTransaction',
  'SessionSegment', 'Shift', 'AuditLog', 'TenantSettings', 'PricingTier',
]);

function getDelegate(model: string) {
  const key = model.charAt(0).toLowerCase() + model.slice(1) as keyof typeof basePrisma;
  return (basePrisma as any)[key];
}

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
      async aggregate({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            args.where = { ...(args.where || {}), tenantId };
          }
        }
        return query(args);
      },
      async count({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            args.where = { ...(args.where || {}), tenantId };
          }
        }
        return query(args);
      },
      async updateMany({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            args.where = { ...(args.where || {}), tenantId };
          }
        }
        return query(args);
      },
      async deleteMany({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            args.where = { ...(args.where || {}), tenantId };
          }
        }
        return query(args);
      },
      async findUnique({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            return getDelegate(model).findFirst({
              ...args,
              where: { ...(args.where || {}), tenantId },
            });
          }
        }
        return query(args);
      },
      async update({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            const record = await getDelegate(model).findFirst({
              where: { ...(args.where || {}), tenantId },
              select: { id: true },
            });
            if (!record) {
              throw new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: '6.0.0',
              });
            }
            return query({ ...args, where: { id: record.id } });
          }
        }
        return query(args);
      },
      async delete({ model, args, query }) {
        if (TENANT_MODELS.has(model)) {
          const tenantId = await getJwtTenantId();
          if (tenantId) {
            const record = await getDelegate(model).findFirst({
              where: { ...(args.where || {}), tenantId },
              select: { id: true },
            });
            if (!record) {
              throw new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: '6.0.0',
              });
            }
            return query({ ...args, where: { id: record.id } });
          }
        }
        return query(args);
      },
    },
  },
});

const db = basePrisma.$extends(tenantExtension);

export default db;
