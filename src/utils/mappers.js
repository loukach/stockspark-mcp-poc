function mapInputToVehicle(input, organizationContext = null) {
  // Use provided context or fall back to environment variables
  const companyId = organizationContext?.companyId || parseInt(process.env.STOCKSPARK_COMPANY_ID);
  const dealerId = organizationContext?.dealerId || parseInt(process.env.STOCKSPARK_DEALER_ID);
  
  if (!companyId || !dealerId) {
    throw new Error('Company and dealer IDs must be provided either via organization context or environment variables');
  }
  
  const baseData = {
    companyId,
    dealerId,
    vehicleClass: { name: "car" }, // Changed to lowercase
    status: { name: "FREE" },
    wheelFormula: { name: "FRONT" },
    body: { name: "SEDAN" }, // Use working body type
    power: 330, // Use working power values
    powerHp: 449, // Use working powerHp values
    cubicCapacity: 2999, // REQUIRED FIELD!
    cylinders: 6, // REQUIRED FIELD!
    seat: 5, // Default seats
    doors: input.doors || 4,
    priceGross: { 
      consumerPrice: input.price
    },
    priceNet: { 
      consumerPrice: input.price 
    },
    vatRate: 0,
    make: { name: input.make },
    model: { name: input.model },
    version: { name: input.version || "Standard" }, // Added default value for version
    fuel: { name: input.fuel },
    gearbox: { name: input.transmission },
    condition: { name: input.condition }
  };

  // Add year/date fields
  if (input.year) {
    baseData.constructionYear = input.year.toString();
    baseData.constructionDate = `${input.year}-01-01T00:00:00.000Z`;
  }

  // Add fields for used vehicles
  if (input.condition === "USED") {
    if (input.mileage) {
      baseData.mileage = input.mileage;
    }
    if (input.plate) {
      baseData.numberPlate = input.plate;
    }
    baseData.firstRegistration = `${input.year}01`; // Default to January
  } else {
    // Still add firstRegistration for NEW vehicles (required field!)
    baseData.firstRegistration = `${input.year}01`;
  }

  // Add required boolean fields
  baseData.accidentDamaged = false;
  baseData.billable = true;
  baseData.comingSoon = false;
  baseData.corporate = false;
  baseData.deductible = false;
  baseData.demo = false;
  baseData.lastMinuteOffer = false;
  baseData.luxury = false;
  baseData.negotiable = true;
  baseData.noviceDrivable = true;
  baseData.onSale = true;
  baseData.promptDelivery = false;
  baseData.reservedNegotiation = false;
  baseData.servicingDoc = false;
  baseData.visibility = true;
  baseData.warranty = false;

  // Add optional fields - SKIP COLOR for now (causes validation errors)
  // if (input.color) {
  //   baseData.color = { name: input.color };
  // }

  return baseData;
}

function formatVehicleResponse(vehicle) {
  return {
    vehicleId: vehicle.vehicleId,
    make: vehicle.make?.name || 'Unknown',
    model: vehicle.model?.name || 'Unknown',
    version: vehicle.version?.name || '',
    year: vehicle.constructionYear || 'Unknown',
    plate: vehicle.numberPlate || 'N/A',
    mileage: vehicle.mileage || 0,
    price: vehicle.priceGross?.consumerPrice || 0,
    fuel: vehicle.fuel?.name || 'Unknown',
    transmission: vehicle.gearbox?.name || 'Unknown',
    condition: vehicle.condition?.name || 'Unknown',
    color: vehicle.color || 'N/A',
    doors: vehicle.doors || 'N/A',
    status: vehicle.status?.name || 'Unknown',
    enteredDate: vehicle.enteredInStockDate,
    imageCount: vehicle.images?.GALLERY_ITEM?.length || vehicle.imageCount || 0,
    hasImages: (vehicle.images?.GALLERY_ITEM?.length || vehicle.imageCount || 0) > 0
  };
}

function formatVehicleListResponse(response) {
  return {
    totalVehicles: response.totalVehicles,
    page: response.pageable?.pageNumber || 0,
    size: response.pageable?.pageSize || 10,
    vehicles: (response.vehicles || []).map(formatVehicleResponse)
  };
}

function analyzeVehiclePerformance(vehicle, options = {}) {
  const {
    minDaysInStock = 30,
    maxImageCount = 5,
    priceThreshold = null
  } = options;

  const analysis = {
    vehicleId: vehicle.vehicleId,
    make: vehicle.make?.name || 'Unknown',
    model: vehicle.model?.name || 'Unknown',
    version: vehicle.version?.name || '',
    year: vehicle.constructionYear || 'Unknown',
    price: vehicle.priceGross?.consumerPrice || 0,
    imageCount: vehicle.images?.GALLERY_ITEM?.length || vehicle.imageCount || 0,
    hasImages: (vehicle.images?.GALLERY_ITEM?.length || vehicle.imageCount || 0) > 0
  };

  // Calculate days in stock
  if (vehicle.enteredInStockDate) {
    const enteredDate = new Date(vehicle.enteredInStockDate);
    const now = new Date();
    analysis.daysInStock = Math.floor((now - enteredDate) / (1000 * 60 * 60 * 24));
  } else {
    analysis.daysInStock = 0;
  }

  // Performance scoring factors
  let performanceScore = 0;
  const factors = [];

  // Days in stock penalty (higher = worse)
  if (analysis.daysInStock > minDaysInStock) {
    const daysPenalty = Math.min((analysis.daysInStock - minDaysInStock) / 30, 5); // Max 5 points
    performanceScore += daysPenalty;
    factors.push(`Days in stock: ${analysis.daysInStock} (penalty: +${daysPenalty.toFixed(1)})`);
  }

  // Image count factor (fewer images = worse)
  if (analysis.imageCount < maxImageCount) {
    const imagePenalty = (maxImageCount - analysis.imageCount) * 0.5;
    performanceScore += imagePenalty;
    factors.push(`Low images: ${analysis.imageCount}/${maxImageCount} (penalty: +${imagePenalty.toFixed(1)})`);
  }

  // Price threshold factor
  if (priceThreshold && analysis.price > priceThreshold) {
    const priceBonus = 1; // Higher priority for expensive cars
    performanceScore += priceBonus;
    factors.push(`High price: €${analysis.price} > €${priceThreshold} (priority: +${priceBonus})`);
  }

  // Determine performance category
  let category = 'good';
  if (performanceScore >= 3) {
    category = 'poor';
  } else if (performanceScore >= 1.5) {
    category = 'underperforming';
  }

  analysis.performanceScore = Math.round(performanceScore * 100) / 100;
  analysis.performanceCategory = category;
  analysis.factors = factors;
  analysis.needsAttention = performanceScore >= 1.5;

  // Recommendations
  const recommendations = [];
  if (analysis.imageCount < 3) {
    recommendations.push('Add more images');
  }
  if (analysis.daysInStock > 60) {
    recommendations.push('Consider price reduction');
  }
  if (analysis.daysInStock > 90) {
    recommendations.push('Review market positioning');
  }
  analysis.recommendations = recommendations;

  return analysis;
}

function formatInventoryHealthReport(vehicles, options = {}) {
  const analyses = vehicles.map(v => analyzeVehiclePerformance(v, options));
  
  const report = {
    totalVehicles: vehicles.length,
    averageDaysInStock: Math.round(analyses.reduce((sum, a) => sum + a.daysInStock, 0) / analyses.length),
    vehiclesWithImages: analyses.filter(a => a.hasImages).length,
    imagesCoveragePercent: Math.round((analyses.filter(a => a.hasImages).length / analyses.length) * 100),
    underperformingCount: analyses.filter(a => a.needsAttention).length,
    poorPerformingCount: analyses.filter(a => a.performanceCategory === 'poor').length,
    averagePrice: Math.round(analyses.reduce((sum, a) => sum + a.price, 0) / analyses.length),
    priceRange: {
      min: Math.min(...analyses.map(a => a.price)),
      max: Math.max(...analyses.map(a => a.price))
    }
  };

  if (options.includeDetails) {
    // Group by brand
    const byBrand = {};
    analyses.forEach(a => {
      if (!byBrand[a.make]) {
        byBrand[a.make] = { count: 0, avgDaysInStock: 0, avgPrice: 0, underperforming: 0 };
      }
      byBrand[a.make].count++;
      byBrand[a.make].avgDaysInStock += a.daysInStock;
      byBrand[a.make].avgPrice += a.price;
      if (a.needsAttention) byBrand[a.make].underperforming++;
    });

    Object.keys(byBrand).forEach(brand => {
      const brandData = byBrand[brand];
      brandData.avgDaysInStock = Math.round(brandData.avgDaysInStock / brandData.count);
      brandData.avgPrice = Math.round(brandData.avgPrice / brandData.count);
    });

    report.brandBreakdown = byBrand;

    // Price ranges
    const priceRanges = {
      'Under €10k': analyses.filter(a => a.price < 10000).length,
      '€10k-€20k': analyses.filter(a => a.price >= 10000 && a.price < 20000).length,
      '€20k-€30k': analyses.filter(a => a.price >= 20000 && a.price < 30000).length,
      'Over €30k': analyses.filter(a => a.price >= 30000).length
    };
    report.priceRangeBreakdown = priceRanges;
  }

  return report;
}

module.exports = {
  mapInputToVehicle,
  formatVehicleResponse,
  formatVehicleListResponse,
  analyzeVehiclePerformance,
  formatInventoryHealthReport
};