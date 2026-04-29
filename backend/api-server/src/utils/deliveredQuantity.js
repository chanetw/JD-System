const toSafeInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed < 0 ? 0 : parsed;
};

export const getEffectiveItemQuantity = (item) => {
  if (item?.deliveredQuantity !== null && item?.deliveredQuantity !== undefined) {
    return toSafeInteger(item.deliveredQuantity, 0);
  }
  return toSafeInteger(item?.quantity, 0);
};

export const normalizeDeliveredItemsInput = (deliveredItems) => {
  if (deliveredItems == null) return [];
  if (!Array.isArray(deliveredItems)) {
    throw new Error('รูปแบบ deliveredItems ไม่ถูกต้อง');
  }

  const uniqueItems = new Map();

  deliveredItems.forEach((entry) => {
    if (!entry) return;

    const itemId = Number.parseInt(entry.itemId, 10);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new Error('รหัสชิ้นงานที่ส่งไม่ถูกต้อง');
    }

    if (entry.deliveredQty === '' || entry.deliveredQty === null || entry.deliveredQty === undefined) {
      return;
    }

    const deliveredQty = Number.parseInt(entry.deliveredQty, 10);
    if (!Number.isInteger(deliveredQty) || deliveredQty < 0) {
      throw new Error(`จำนวนชิ้นที่ส่งของรายการ ${itemId} ไม่ถูกต้อง`);
    }

    uniqueItems.set(itemId, { itemId, deliveredQty });
  });

  return Array.from(uniqueItems.values());
};

export const buildEffectiveItemCountMap = (rows) => {
  const totals = new Map();

  rows.forEach((row) => {
    const currentTotal = totals.get(row.jobId) || 0;
    totals.set(row.jobId, currentTotal + getEffectiveItemQuantity(row));
  });

  return totals;
};

export const sumEffectiveItemQuantities = (rows) => {
  return rows.reduce((sum, row) => sum + getEffectiveItemQuantity(row), 0);
};

export const fetchEffectiveItemCountMap = async (prisma, jobIds) => {
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.designJobItem.findMany({
    where: {
      jobId: { in: jobIds }
    },
    select: {
      jobId: true,
      quantity: true,
      deliveredQuantity: true
    }
  });

  return buildEffectiveItemCountMap(rows);
};

export const fetchEffectiveItemTotal = async (prisma, jobWhere) => {
  const rows = await prisma.designJobItem.findMany({
    where: {
      job: {
        is: jobWhere
      }
    },
    select: {
      quantity: true,
      deliveredQuantity: true
    }
  });

  return sumEffectiveItemQuantities(rows);
};