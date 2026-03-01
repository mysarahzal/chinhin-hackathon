export interface PricingInput {
  sku: string;
  productName: string;
  customerName: string;
  customerTier: 'Standard' | 'Loyal' | 'Corporate';
  salesChannel: 'Traditional' | 'Corporate' | 'E-commerce' | 'Project';
  costPrice: number;
  currentStock: number;
  inventoryAging: number;
  demandLevel: 'Low' | 'Medium' | 'High';
  competitorPrice?: number;
}

export interface PricingResult {
  recommendedPrice: number;
  expectedMargin: number;
  estimatedRevenue: number;
  profitPerUnit: number;
  marginCompliance: 'Pass' | 'Warning' | 'Fail';
  rationale: string[];
  minimumMargin: number;
  basePrice: number;
}

const MINIMUM_MARGINS: Record<string, number> = {
  Standard: 0.20,
  Loyal: 0.15,
  Corporate: 0.12,
};

const CHANNEL_ADJUSTMENTS: Record<string, number> = {
  Traditional: 0,
  Corporate: -0.03,
  'E-commerce': -0.05,
  Project: -0.07,
};

const TIER_DISCOUNT: Record<string, number> = {
  Standard: 0,
  Loyal: 0.03,
  Corporate: 0.05,
};

export function calculatePricing(input: PricingInput): PricingResult {
  const rationale: string[] = [];
  const minMargin = MINIMUM_MARGINS[input.customerTier];

  // Base markup: 35% over cost
  let markup = 0.35;
  let basePrice = input.costPrice * (1 + markup);

  // Demand adjustments
  if (input.demandLevel === 'High') {
    markup += 0.10;
    rationale.push('High demand detected – margin protected (+10% markup)');
  } else if (input.demandLevel === 'Low') {
    markup -= 0.05;
    rationale.push('Low demand – slight discount applied (-5% markup)');
  } else {
    rationale.push('Medium demand – standard pricing applied');
  }

  // Inventory aging adjustments
  if (input.inventoryAging > 120) {
    markup -= 0.12;
    rationale.push('Stock aging > 120 days – significant discount recommended (-12%)');
  } else if (input.inventoryAging > 90) {
    markup -= 0.08;
    rationale.push('Stock aging > 90 days – discount recommended (-8%)');
  } else if (input.inventoryAging > 60) {
    markup -= 0.04;
    rationale.push('Stock aging > 60 days – minor discount applied (-4%)');
  }

  // Customer tier adjustments
  const tierDiscount = TIER_DISCOUNT[input.customerTier];
  if (tierDiscount > 0) {
    markup -= tierDiscount;
    rationale.push(`${input.customerTier} customer tier – moderate flexibility allowed (-${(tierDiscount * 100).toFixed(0)}%)`);
  }

  // Channel adjustments
  const channelAdj = CHANNEL_ADJUSTMENTS[input.salesChannel];
  if (channelAdj !== 0) {
    markup += channelAdj;
    rationale.push(`${input.salesChannel} channel – pricing adjusted (${(channelAdj * 100).toFixed(0)}%)`);
  }

  // Stock level adjustments
  if (input.currentStock > 500) {
    markup -= 0.03;
    rationale.push('High inventory level – volume discount applied (-3%)');
  }

  // Ensure minimum margin
  if (markup < minMargin) {
    markup = minMargin;
    rationale.push(`Margin floor enforced – minimum ${(minMargin * 100).toFixed(0)}% margin for ${input.customerTier} tier`);
  }

  let recommendedPrice = input.costPrice * (1 + markup);

  // Competitor benchmark
  if (input.competitorPrice && input.competitorPrice > 0) {
    if (recommendedPrice > input.competitorPrice * 1.15) {
      recommendedPrice = input.competitorPrice * 1.05;
      rationale.push('Price adjusted to stay competitive (within 5% of competitor)');
    } else if (recommendedPrice < input.competitorPrice * 0.85) {
      rationale.push('Price significantly below competitor – opportunity to increase margin');
    }
  }

  const expectedMargin = (recommendedPrice - input.costPrice) / recommendedPrice;
  const profitPerUnit = recommendedPrice - input.costPrice;
  const estimatedRevenue = recommendedPrice * Math.min(input.currentStock, 100);

  let marginCompliance: 'Pass' | 'Warning' | 'Fail' = 'Pass';
  if (expectedMargin < minMargin) {
    marginCompliance = 'Fail';
  } else if (expectedMargin < minMargin + 0.05) {
    marginCompliance = 'Warning';
  }

  return {
    recommendedPrice: Math.round(recommendedPrice * 100) / 100,
    expectedMargin: Math.round(expectedMargin * 10000) / 100,
    estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
    profitPerUnit: Math.round(profitPerUnit * 100) / 100,
    marginCompliance,
    rationale,
    minimumMargin: minMargin * 100,
    basePrice: Math.round(basePrice * 100) / 100,
  };
}

export function simulatePrice(
  costPrice: number,
  sellingPrice: number,
  stock: number,
  minimumMarginPercent: number
) {
  const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
  const profitPerUnit = sellingPrice - costPrice;
  const revenue = sellingPrice * Math.min(stock, 100);
  const profit = profitPerUnit * Math.min(stock, 100);
  const belowThreshold = margin < minimumMarginPercent;

  return {
    margin: Math.round(margin * 100) / 100,
    profitPerUnit: Math.round(profitPerUnit * 100) / 100,
    revenue: Math.round(revenue * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    belowThreshold,
  };
}
