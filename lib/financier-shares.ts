export function percentToBasisPoints(percent: string): bigint {
  const [wholeRaw, fracRaw = ""] = String(percent ?? "0").split(".");
  const whole = wholeRaw.replace(/\D/g, "") || "0";
  const frac = fracRaw.replace(/\D/g, "").padEnd(2, "0").slice(0, 2);
  return BigInt(whole) * BigInt(100) + BigInt(frac || "0");
}

type FinancierShareInput = {
  userId: string;
  sharePercent: string;
};

/**
 * Split totalAmount across financiers proportionally to their sharePercent values.
 * Uses largest-remainder rounding so the parts always sum exactly to totalAmount.
 */
export function calculateFinancierAmounts(
  totalAmount: bigint,
  financiers: FinancierShareInput[],
): Map<string, bigint> {
  const amounts = new Map<string, bigint>();

  if (totalAmount <= BigInt(0) || financiers.length === 0) {
    for (const financier of financiers) {
      amounts.set(financier.userId, BigInt(0));
    }
    return amounts;
  }

  const totalBasisPoints = financiers.reduce(
    (sum, financier) => sum + percentToBasisPoints(financier.sharePercent),
    BigInt(0),
  );

  if (totalBasisPoints <= BigInt(0)) {
    for (const financier of financiers) {
      amounts.set(financier.userId, BigInt(0));
    }
    return amounts;
  }

  const entries = financiers.map((financier) => {
    const basisPoints = percentToBasisPoints(financier.sharePercent);
    const product = totalAmount * basisPoints;
    return {
      userId: financier.userId,
      floor: product / totalBasisPoints,
      remainder: product % totalBasisPoints,
    };
  });

  for (const entry of entries) {
    amounts.set(entry.userId, entry.floor);
  }

  const allocated = entries.reduce((sum, entry) => sum + entry.floor, BigInt(0));
  let remainder = totalAmount - allocated;

  if (remainder > BigInt(0)) {
    const ranked = [...entries].sort((a, b) => {
      if (a.remainder !== b.remainder) {
        return a.remainder > b.remainder ? -1 : 1;
      }
      return a.userId.localeCompare(b.userId);
    });

    for (let i = 0; i < Number(remainder); i += 1) {
      const entry = ranked[i % ranked.length];
      amounts.set(entry.userId, (amounts.get(entry.userId) ?? BigInt(0)) + BigInt(1));
    }
  }

  return amounts;
}
