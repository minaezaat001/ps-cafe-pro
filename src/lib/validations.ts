import { z } from "zod";

export const DeviceSchema = z.object({
  number: z.string().min(1),
  type: z.enum(["PLAYSTATION", "XBOX", "PC", "VR", "OTHER"]),
  hourlyRateSingle: z.number().min(0).finite(),
  hourlyRateMulti: z.number().min(0).finite(),
  isActive: z.boolean().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).optional(),
});

export const ShiftOpenSchema = z.object({
  openingFloat: z.number().min(0).finite(),
});

export const ShiftCloseSchema = z.object({
  shiftId: z.string().min(1),
  actualCash: z.number().min(0).finite(),
  notes: z.string().optional(),
});

export const InventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  price: z.number().min(0).finite(),
  stock: z.number().int().min(0),
});

export const InventoryUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  price: z.number().min(0).finite().optional(),
  stock: z.number().int().min(0).optional(),
});

export const FinanceTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().gt(0).finite(),
  description: z.string().min(1).max(500),
  reason: z.string().min(1).max(1000),
});

export const OrderItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().gt(0),
});

export const CartSchema = z.array(OrderItemSchema).min(1);

export const StartSessionSchema = z.object({
  deviceId: z.string().min(1),
  type: z.enum(["OPEN", "FIXED"]),
  durationMinutes: z.number().int().positive().finite().optional(),
  isMulti: z.boolean().optional(),
});

export const EndSessionSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().optional(),
  discountPercent: z.number().min(0).max(100).finite().optional(),
  discountReason: z.string().max(500).optional(),
});

export const AddSessionTimeSchema = z.object({
  sessionId: z.string().min(1),
  additionalMinutes: z.number().int().gt(0).finite(),
  reason: z.string().optional(),
});

export const DeleteFinanceSchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1).max(1000),
});

export const SaveAppSettingSchema = z.object({
  key: z.string().min(1).max(200),
  value: z.string().max(2000),
});

export const UpdateTenantSettingsSchema = z.object({
  currency: z.string().min(1).max(10).optional(),
  currencySymbol: z.string().min(1).max(10).optional(),
  timezone: z.string().min(1).max(100).optional(),
  reason: z.string().max(1000).optional(),
});

export const AddUserSchema = z.object({
  username: z.string().min(2).max(100),
  password: z.string().min(1).max(200),
  role: z.enum(["ADMIN", "CASHIER", "STAFF"]),
  permissions: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(2).max(100).optional(),
  password: z.string().min(1).max(200).optional(),
  role: z.enum(["ADMIN", "CASHIER", "STAFF"]).optional(),
  permissions: z.string().optional(),
});

export const ClearOldDataSchema = z.object({
  days: z.number().int().positive().finite(),
});

export const CustomerOrderSchema = z.object({
  deviceId: z.string().min(1),
  cart: CartSchema,
});

/** Utility: wraps schema.parse and returns a user-facing Arabic error message on failure */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const message = firstIssue
      ? `${getFieldLabel(firstIssue.path.join("."))}: ${firstIssue.message}`
      : "بيانات الإدخال غير صالحة";
    throw new Error(message);
  }
  return result.data;
}

function getFieldLabel(path: string): string {
  const labels: Record<string, string> = {
    amount: "المبلغ",
    price: "السعر",
    stock: "الكمية",
    name: "الاسم",
    category: "التصنيف",
    description: "الوصف",
    reason: "السبب",
    type: "النوع",
    quantity: "العدد",
    deviceId: "الجهاز",
    sessionId: "الجلسة",
    shiftId: "الوردية",
    actualCash: "النقدية الفعلية",
    openingFloat: "الصندوق الافتتاحي",
    discountPercent: "نسبة الخصم",
    discountReason: "سبب الخصم",
    additionalMinutes: "الدقائق الإضافية",
    notes: "ملاحظات",
    number: "رقم الجهاز",
    hourlyRateSingle: "سعر الفردي",
    hourlyRateMulti: "سعر المتعدد",
    durationMinutes: "المدة بالدقائق",
    isMulti: "متعدد اللاعبين",
    cart: "السلة",
    itemId: "الصنف",
    key: "المفتاح",
    value: "القيمة",
    currency: "العملة",
    currencySymbol: "رمز العملة",
    timezone: "المنطقة الزمنية",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    role: "الدور",
    permissions: "الصلاحيات",
    days: "الأيام",
    minutes: "الدقائق",
  };
  return labels[path] || path;
}
