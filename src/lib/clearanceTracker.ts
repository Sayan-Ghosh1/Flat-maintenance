import { getMonthName } from './formatters';
import type { 
  Member, 
  Payment, 
  PaymentAllocation, 
  MemberClearanceSummary, 
  MonthClearanceItem, 
  YearClearanceItem,
  ClearanceStatus 
} from '../types/database';

/**
 * Normalizes payment allocations, falling back to legacy payment_month / payment_year
 * if no explicit payment_allocations table records exist yet for a payment.
 */
export function getAllocationsForMember(
  memberId: string,
  payments: Payment[],
  allocations: PaymentAllocation[] = [],
  memberMonthlyRate: number = 0
): PaymentAllocation[] {
  const explicitAllocations = allocations.filter((a) => a.member_id === memberId);
  const allocatedPaymentIds = new Set(explicitAllocations.map((a) => a.payment_id));

  // Synthesize allocations for payments that don't have explicit allocation records
  const syntheticAllocations: PaymentAllocation[] = [];

  payments
    .filter((p) => p.member_id === memberId && !allocatedPaymentIds.has(p.id))
    .forEach((p) => {
      // Check if start/end month are present
      if (p.start_year && p.start_month && p.end_year && p.end_month) {
        const start = p.start_year * 12 + p.start_month;
        const end = p.end_year * 12 + p.end_month;
        const count = Math.max(1, end - start + 1);
        const perMonth = p.amount / count;

        for (let idx = start; idx <= end; idx++) {
          const yr = Math.floor((idx - 1) / 12);
          const mo = ((idx - 1) % 12) + 1;
          syntheticAllocations.push({
            id: `synth-${p.id}-${yr}-${mo}`,
            payment_id: p.id,
            member_id: memberId,
            maintenance_year: yr,
            maintenance_month: mo,
            allocated_amount: perMonth,
            created_at: p.created_at || new Date().toISOString(),
          });
        }
      } else if (p.payment_year && p.payment_month) {
        const rate = memberMonthlyRate || (p.member?.monthly_amount as number) || 0;
        const inferredCount = (rate > 0 && p.payment_type !== 'Annual' && p.amount >= rate * 1.5)
          ? Math.round(p.amount / rate)
          : 1;

        if (inferredCount > 1) {
          const endIdx = p.payment_year * 12 + p.payment_month;
          const startIdx = endIdx - inferredCount + 1;
          const perMonth = p.amount / inferredCount;
          for (let idx = startIdx; idx <= endIdx; idx++) {
            const yr = Math.floor((idx - 1) / 12);
            const mo = ((idx - 1) % 12) + 1;
            syntheticAllocations.push({
              id: `synth-${p.id}-${yr}-${mo}`,
              payment_id: p.id,
              member_id: memberId,
              maintenance_year: yr,
              maintenance_month: mo,
              allocated_amount: perMonth,
              created_at: p.created_at || new Date().toISOString(),
            });
          }
        } else {
          syntheticAllocations.push({
            id: `synth-${p.id}-${p.payment_year}-${p.payment_month}`,
            payment_id: p.id,
            member_id: memberId,
            maintenance_year: p.payment_year,
            maintenance_month: p.payment_month,
            allocated_amount: p.amount,
            created_at: p.created_at || new Date().toISOString(),
          });
        }
      } else if (p.payment_year && p.payment_type === 'Annual') {
        syntheticAllocations.push({
          id: `synth-${p.id}-${p.payment_year}-annual`,
          payment_id: p.id,
          member_id: memberId,
          maintenance_year: p.payment_year,
          maintenance_month: null,
          allocated_amount: p.amount,
          created_at: p.created_at || new Date().toISOString(),
        });
      } else {
        // Fallback to payment date year & month
        const pDate = new Date(p.payment_date);
        const yr = !isNaN(pDate.getTime()) ? pDate.getFullYear() : new Date().getFullYear();
        const mo = !isNaN(pDate.getTime()) ? pDate.getMonth() + 1 : 1;
        syntheticAllocations.push({
          id: `synth-${p.id}-date`,
          payment_id: p.id,
          member_id: memberId,
          maintenance_year: yr,
          maintenance_month: mo,
          allocated_amount: p.amount,
          created_at: p.created_at || new Date().toISOString(),
        });
      }
    });

  return [...explicitAllocations, ...syntheticAllocations];
}

/**
 * Calculates complete maintenance clearance state for a member.
 */
export function calculateMemberClearance(
  member: Member,
  payments: Payment[] = [],
  allocations: PaymentAllocation[] = [],
  targetYear: number = new Date().getFullYear(),
  asOfDate: Date = new Date()
): {
  summary: MemberClearanceSummary;
  monthlyTimeline: MonthClearanceItem[];
  annualTimeline: YearClearanceItem[];
} {
  const currentYear = asOfDate.getFullYear();
  const currentMonth = asOfDate.getMonth() + 1;

  const frequency = member.maintenance_frequency === 'annual' ? 'annual' : 'monthly';
  const monthlyRate = Number(member.monthly_amount || 0);
  const annualRate = Number(member.annual_amount || 0) > 0 
    ? Number(member.annual_amount) 
    : monthlyRate * 12;

  const effectiveRate = frequency === 'annual' ? annualRate : monthlyRate;

  // Get member's payments and combined allocations
  const memberPayments = payments.filter((p) => p.member_id === member.id);
  const paymentMap = new Map(memberPayments.map((p) => [p.id, p]));
  const memberAllocations = getAllocationsForMember(member.id, memberPayments, allocations, monthlyRate);

  // Map allocations by period
  const monthAllocationMap = new Map<string, { amount: number; items: any[] }>();
  const yearAllocationMap = new Map<number, { amount: number; items: any[] }>();

  let totalAllocatedMoney = 0;
  for (const alloc of memberAllocations) {
    const p = paymentMap.get(alloc.payment_id);
    const item = {
      allocationId: alloc.id,
      paymentId: alloc.payment_id,
      paymentDate: p?.payment_date || alloc.created_at,
      amount: Number(alloc.allocated_amount || 0),
      paymentMethod: p?.payment_method,
      reference: p?.transaction_reference,
    };

    totalAllocatedMoney += item.amount;

    if (alloc.maintenance_month) {
      const key = `${alloc.maintenance_year}-${alloc.maintenance_month}`;
      const existing = monthAllocationMap.get(key) || { amount: 0, items: [] };
      existing.amount += item.amount;
      existing.items.push(item);
      monthAllocationMap.set(key, existing);
    } else {
      // Annual allocation
      const existing = yearAllocationMap.get(alloc.maintenance_year) || { amount: 0, items: [] };
      existing.amount += item.amount;
      existing.items.push(item);
      yearAllocationMap.set(alloc.maintenance_year, existing);
    }
  }

  // 1. Build 12-month timeline for targetYear
  const monthlyTimeline: MonthClearanceItem[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${targetYear}-${m}`;
    const allocData = monthAllocationMap.get(key) || { amount: 0, items: [] };
    const paid = allocData.amount;
    const required = monthlyRate;
    const remaining = Math.max(0, required - paid);

    let status: ClearanceStatus = 'Pending';
    if (required === 0 && paid === 0) {
      status = 'Not Yet Due';
    } else if (paid >= required && required > 0) {
      status = 'Paid';
    } else {
      status = 'Pending';
    }

    monthlyTimeline.push({
      year: targetYear,
      month: m,
      monthName: getMonthName(m),
      requiredAmount: required,
      paidAmount: paid,
      remainingAmount: remaining,
      status: paid >= required && required > 0 ? 'Paid' : 'Pending',
      allocations: allocData.items,
    });
  }

  // 2. Build multi-year annual timeline
  const annualTimeline: YearClearanceItem[] = [];
  const yearsToTrack = [targetYear - 1, targetYear, targetYear + 1];
  for (const yr of yearsToTrack) {
    const allocData = yearAllocationMap.get(yr) || { amount: 0, items: [] };
    let monthlySumForYear = 0;
    for (let m = 1; m <= 12; m++) {
      monthlySumForYear += (monthAllocationMap.get(`${yr}-${m}`)?.amount || 0);
    }
    const totalYearPaid = allocData.amount + (frequency === 'annual' && allocData.amount === 0 ? monthlySumForYear : 0);
    const required = annualRate;
    const remaining = Math.max(0, required - totalYearPaid);

    annualTimeline.push({
      year: yr,
      requiredAmount: required,
      paidAmount: totalYearPaid,
      remainingAmount: remaining,
      status: totalYearPaid >= required && required > 0 ? 'Paid' : 'Pending',
      paymentDate: allocData.items[0]?.paymentDate || null,
      allocations: allocData.items,
    });
  }

  // 3. Determine real-time cleared month and year from actual member payment records
  // Collect all months that have been paid for
  const paidMonths: { year: number; month: number; amount: number }[] = [];
  monthAllocationMap.forEach((val, key) => {
    if (val.amount > 0) {
      const [yStr, mStr] = key.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(y) && !isNaN(m)) {
        paidMonths.push({ year: y, month: m, amount: val.amount });
      }
    }
  });

  // Also verify against direct payment records to ensure any recorded month is counted
  for (const p of memberPayments) {
    if (p.start_year && p.start_month && p.end_year && p.end_month) {
      const start = p.start_year * 12 + p.start_month;
      const end = p.end_year * 12 + p.end_month;
      const count = Math.max(1, end - start + 1);
      const perMonth = p.amount / count;
      for (let idx = start; idx <= end; idx++) {
        const yr = Math.floor((idx - 1) / 12);
        const mo = ((idx - 1) % 12) + 1;
        if (!paidMonths.some((item) => item.year === yr && item.month === mo)) {
          paidMonths.push({ year: yr, month: mo, amount: perMonth });
        }
      }
    } else {
      const rate = monthlyRate > 0 ? monthlyRate : 0;
      const inferredCount = (rate > 0 && p.payment_type !== 'Annual' && p.amount >= rate * 1.5)
        ? Math.round(p.amount / rate)
        : 1;
      const endYr = p.payment_year || (p.payment_date ? new Date(p.payment_date).getFullYear() : null);
      const endMo = p.payment_month || (p.payment_date ? new Date(p.payment_date).getMonth() + 1 : null);
      if (endYr && endMo) {
        const endIdx = endYr * 12 + endMo;
        const startIdx = endIdx - inferredCount + 1;
        const perMonth = p.amount / inferredCount;
        for (let idx = startIdx; idx <= endIdx; idx++) {
          const yr = Math.floor((idx - 1) / 12);
          const mo = ((idx - 1) % 12) + 1;
          if (!paidMonths.some((item) => item.year === yr && item.month === mo)) {
            paidMonths.push({ year: yr, month: mo, amount: perMonth });
          }
        }
      }
    }
  }

  // Sort chronologically ascending
  paidMonths.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));

  let latestClearedYear: number | null = null;
  let latestClearedMonth: number | null = null;

  if (paidMonths.length > 0) {
    const latest = paidMonths[paidMonths.length - 1];
    latestClearedYear = latest.year;
    latestClearedMonth = latest.month;
  }

  // Check annual allocations
  let latestClearedAnnualYear: number | null = null;
  yearAllocationMap.forEach((val, y) => {
    if (val.amount > 0) {
      if (!latestClearedAnnualYear || y > latestClearedAnnualYear) {
        latestClearedAnnualYear = y;
      }
    }
  });

  // Latest payment transaction date
  const sortedPayments = [...memberPayments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );
  const lastPaymentDate = sortedPayments[0]?.payment_date || null;

  // Clean real-time text showing till which month and year maintenance is cleared
  let paidThroughText = 'Not cleared yet';
  let overallStatus: ClearanceStatus = 'Pending';

  if (frequency === 'annual' && latestClearedAnnualYear) {
    paidThroughText = `Cleared till: ${latestClearedAnnualYear}`;
    overallStatus = 'Paid';
  } else if (latestClearedYear && latestClearedMonth) {
    paidThroughText = `Cleared till: ${getMonthName(latestClearedMonth)} ${latestClearedYear}`;
    overallStatus = 'Paid';
  } else if (latestClearedAnnualYear) {
    paidThroughText = `Cleared till: ${latestClearedAnnualYear}`;
    overallStatus = 'Paid';
  } else {
    paidThroughText = memberPayments.length > 0 && lastPaymentDate
      ? `Cleared till: ${getMonthName(new Date(lastPaymentDate).getMonth() + 1)} ${new Date(lastPaymentDate).getFullYear()}`
      : 'Not cleared yet';
    overallStatus = memberPayments.length > 0 ? 'Paid' : 'Pending';
  }

  const monthsCleared = paidMonths.length;
  const currentKey = `${currentYear}-${currentMonth}`;
  const currentPaid = monthAllocationMap.get(currentKey)?.amount || 0;
  const currentPeriodDue = Math.max(0, monthlyRate - currentPaid);

  return {
    summary: {
      frequency,
      rate: effectiveRate,
      paidThroughText,
      paidThroughYear: latestClearedYear,
      paidThroughMonth: latestClearedMonth,
      currentPeriodText: `${getMonthName(currentMonth)} ${currentYear}`,
      currentPeriodDue,
      totalOutstanding: 0,
      advanceCredit: 0,
      unallocatedCredit: 0,
      lastPaymentDate,
      monthsCleared,
      monthsPending: 0,
      overallStatus,
    },
    monthlyTimeline,
    annualTimeline,
  };
}

/**
 * Helper to compute period coverage breakdown for Admin payment allocation form.
 */
export function generateAllocationPlan(
  amount: number,
  monthlyRate: number,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  frequency: 'monthly' | 'annual' = 'monthly'
): {
  allocations: {
    year: number;
    month: number | null;
    periodLabel: string;
    required: number;
    allocated: number;
    remaining: number;
    status: 'Covered' | 'Partial' | 'Surplus';
  }[];
  totalAllocated: number;
  unallocated: number;
  monthsCount: number;
} {
  const allocations: any[] = [];
  let remainingMoneyToAllocate = amount;

  if (frequency === 'annual') {
    const yearCount = Math.max(1, endYear - startYear + 1);
    const requiredPerYear = monthlyRate * 12;
    for (let y = startYear; y <= endYear; y++) {
      const needed = requiredPerYear;
      const allocated = Math.min(remainingMoneyToAllocate, needed > 0 ? needed : remainingMoneyToAllocate);
      remainingMoneyToAllocate -= allocated;

      allocations.push({
        year: y,
        month: null,
        periodLabel: `Year ${y}`,
        required: needed,
        allocated,
        remaining: Math.max(0, needed - allocated),
        status: allocated >= needed && needed > 0 ? 'Covered' : allocated > 0 ? 'Partial' : 'Surplus',
      });
    }

    return {
      allocations,
      totalAllocated: amount - remainingMoneyToAllocate,
      unallocated: Math.max(0, remainingMoneyToAllocate),
      monthsCount: yearCount * 12,
    };
  }

  // Monthly allocation
  const startIdx = startYear * 12 + startMonth;
  const endIdx = endYear * 12 + endMonth;
  const totalPeriods = Math.max(1, endIdx - startIdx + 1);

  // If amount exactly covers or spreads evenly, distribute to each period
  for (let idx = startIdx; idx <= endIdx; idx++) {
    const yr = Math.floor((idx - 1) / 12);
    const mo = ((idx - 1) % 12) + 1;
    const required = monthlyRate;

    let allocatedForThisMonth = 0;
    if (required > 0) {
      allocatedForThisMonth = Math.min(remainingMoneyToAllocate, required);
    } else {
      allocatedForThisMonth = remainingMoneyToAllocate / (endIdx - idx + 1);
    }

    remainingMoneyToAllocate = Math.max(0, remainingMoneyToAllocate - allocatedForThisMonth);
    const remainingDues = Math.max(0, required - allocatedForThisMonth);

    allocations.push({
      year: yr,
      month: mo,
      periodLabel: `${getMonthName(mo)} ${yr}`,
      required,
      allocated: allocatedForThisMonth,
      remaining: remainingDues,
      status: allocatedForThisMonth >= required && required > 0 ? 'Covered' : allocatedForThisMonth > 0 ? 'Partial' : 'Surplus',
    });
  }

  return {
    allocations,
    totalAllocated: amount - remainingMoneyToAllocate,
    unallocated: remainingMoneyToAllocate,
    monthsCount: totalPeriods,
  };
}
