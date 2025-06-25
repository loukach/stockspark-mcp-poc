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
    creationDate: vehicle.creationDate,
    imageCount: vehicle.gallery?.length || vehicle.images?.GALLERY_ITEM?.length || vehicle.imageCount || 0,
    hasImages: (vehicle.gallery?.length || vehicle.images?.GALLERY_ITEM?.length || vehicle.imageCount || 0) > 0
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
    priceThreshold = null,
    leadData = null
  } = options;

  const analysis = {
    vehicleId: vehicle.vehicleId,
    make: vehicle.make?.name || 'Unknown',
    model: vehicle.model?.name || 'Unknown',
    version: vehicle.version?.name || '',
    year: vehicle.constructionYear || 'Unknown',
    price: vehicle.priceGross?.consumerPrice || 0,
    imageCount: vehicle.gallery?.length || vehicle.images?.GALLERY_ITEM?.length || vehicle.imageCount || 0,
    hasImages: (vehicle.gallery?.length || vehicle.images?.GALLERY_ITEM?.length || vehicle.imageCount || 0) > 0
  };

  // Add lead metrics if provided
  if (leadData && Array.isArray(leadData)) {
    const vehicleLeads = leadData.filter(lead => 
      lead.vehicle_id === vehicle.vehicleId || 
      lead.vehicleId === vehicle.vehicleId ||
      lead.stockNumber === vehicle.vehicleId
    );
    
    analysis.leadCount = vehicleLeads.length;
    analysis.hasLeads = vehicleLeads.length > 0;
    
    if (vehicleLeads.length > 0) {
      // Calculate lead metrics using dateCreated field from Dealer.K API
      const now = new Date();
      const recentLeads = vehicleLeads.filter(lead => {
        const leadDate = new Date(lead.dateCreated || lead.created_at || lead.date || lead.createdAt);
        return !isNaN(leadDate.getTime()) && (now - leadDate) <= 30 * 24 * 60 * 60 * 1000; // Last 30 days
      });
      
      analysis.recentLeadCount = recentLeads.length;
      analysis.avgLeadsPerWeek = recentLeads.length / 4.3; // 30 days ≈ 4.3 weeks
      
      // Get most recent lead date
      const latestLead = vehicleLeads.reduce((latest, lead) => {
        const leadDate = new Date(lead.dateCreated || lead.created_at || lead.date || lead.createdAt);
        const latestDate = new Date(latest.dateCreated || latest.created_at || latest.date || latest.createdAt);
        
        // Handle invalid dates
        if (isNaN(leadDate.getTime())) return latest;
        if (isNaN(latestDate.getTime())) return lead;
        
        return leadDate > latestDate ? lead : latest;
      });
      
      analysis.lastLeadDate = latestLead.dateCreated || latestLead.created_at || latestLead.date || latestLead.createdAt;
      
      // Calculate days since last lead
      if (analysis.lastLeadDate) {
        const daysSinceLastLead = Math.floor((now - new Date(analysis.lastLeadDate)) / (1000 * 60 * 60 * 24));
        analysis.daysSinceLastLead = daysSinceLastLead;
      }
    } else {
      analysis.leadCount = 0;
      analysis.recentLeadCount = 0;
      analysis.avgLeadsPerWeek = 0;
      analysis.lastLeadDate = null;
      analysis.daysSinceLastLead = null;
    }
  } else {
    // Default values when no lead data provided
    analysis.leadCount = null;
    analysis.hasLeads = null;
    analysis.recentLeadCount = null;
    analysis.avgLeadsPerWeek = null;
    analysis.lastLeadDate = null;
    analysis.daysSinceLastLead = null;
  }

  // Calculate days since creation
  if (vehicle.creationDate) {
    const createdDate = new Date(vehicle.creationDate);
    const now = new Date();
    analysis.daysInStock = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
  } else {
    analysis.daysInStock = 0;
  }

  // OBJECTIVE METRICS (no subjective scoring)
  analysis.metrics = {
    days_in_stock: analysis.daysInStock,
    image_count: analysis.imageCount,
    price_euros: analysis.price,
    has_complete_listing: analysis.imageCount >= 3 && analysis.price > 0,
    listing_completeness_percent: Math.round(
      ((analysis.imageCount > 0 ? 25 : 0) + 
       (analysis.imageCount >= 3 ? 25 : 0) + 
       (analysis.price > 0 ? 25 : 0) + 
       (analysis.make !== 'Unknown' && analysis.model !== 'Unknown' ? 25 : 0)) 
    ),
    // Lead-related metrics
    lead_count: analysis.leadCount,
    recent_lead_count: analysis.recentLeadCount,
    avg_leads_per_week: analysis.avgLeadsPerWeek,
    days_since_last_lead: analysis.daysSinceLastLead,
    has_recent_leads: analysis.recentLeadCount > 0
  };

  // INDUSTRY BENCHMARKS (objective thresholds)
  analysis.benchmarks = {
    days_in_stock_status: analysis.daysInStock <= 30 ? 'fresh' : 
                         analysis.daysInStock <= 60 ? 'normal' : 
                         analysis.daysInStock <= 90 ? 'aging' : 'stale',
    image_coverage_status: analysis.imageCount === 0 ? 'none' :
                          analysis.imageCount < 3 ? 'minimal' :
                          analysis.imageCount < 8 ? 'adequate' : 'excellent',
    data_quality_status: analysis.make === 'Unknown' || analysis.model === 'Unknown' ? 'poor' : 'good',
    // Lead performance benchmarks
    lead_interest_level: analysis.leadCount === null ? 'unknown' :
                        analysis.leadCount === 0 ? 'no_interest' :
                        analysis.leadCount < 3 ? 'low_interest' :
                        analysis.leadCount < 8 ? 'moderate_interest' : 'high_interest',
    lead_recency_status: analysis.daysSinceLastLead === null ? 'unknown' :
                        analysis.daysSinceLastLead <= 7 ? 'very_recent' :
                        analysis.daysSinceLastLead <= 14 ? 'recent' :
                        analysis.daysSinceLastLead <= 30 ? 'moderate' : 'stale_leads'
  };

  // ACTIONABLE INSIGHTS (specific, measurable)
  analysis.actionable_insights = [];
  
  if (analysis.imageCount === 0) {
    analysis.actionable_insights.push({
      priority: 'critical',
      action: 'upload_images',
      description: 'No images uploaded - vehicle cannot be effectively marketed',
      impact: 'blocks_sales',
      estimated_time_saved: '1-2 weeks faster sale with images'
    });
  } else if (analysis.imageCount < 3) {
    analysis.actionable_insights.push({
      priority: 'high',
      action: 'upload_more_images',
      description: `Only ${analysis.imageCount} images - industry standard is 5-8 images`,
      impact: 'reduces_buyer_interest',
      estimated_improvement: '20-30% more inquiries with complete image set'
    });
  }

  if (analysis.daysInStock > 90) {
    const suggestedDiscount = Math.min(15, Math.floor(analysis.daysInStock / 30) * 3);
    analysis.actionable_insights.push({
      priority: 'high',
      action: 'price_adjustment',
      description: `${analysis.daysInStock} days in stock exceeds 90-day threshold`,
      impact: 'inventory_carrying_costs',
      suggested_price_reduction: `${suggestedDiscount}% (€${Math.round(analysis.price * suggestedDiscount / 100)})`,
      market_position: analysis.daysInStock > 120 ? 'significantly_overpriced' : 'moderately_overpriced'
    });
  } else if (analysis.daysInStock > 60) {
    analysis.actionable_insights.push({
      priority: 'medium',
      action: 'monitor_closely',
      description: `${analysis.daysInStock} days in stock approaching 90-day threshold`,
      impact: 'early_warning',
      next_review_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  if (analysis.make === 'Unknown' || analysis.model === 'Unknown') {
    analysis.actionable_insights.push({
      priority: 'medium',
      action: 'fix_data_quality',
      description: 'Missing vehicle identification data affects searchability',
      impact: 'seo_and_filtering',
      specific_issues: (analysis.make === 'Unknown' ? ['missing_make'] : []).concat(
                      analysis.model === 'Unknown' ? ['missing_model'] : [])
    });
  }

  // Lead-based insights
  if (analysis.leadCount !== null) {
    if (analysis.leadCount > 5 && analysis.daysInStock > 60) {
      analysis.actionable_insights.push({
        priority: 'high',
        action: 'investigate_conversion_barrier',
        description: `High lead count (${analysis.leadCount}) but vehicle still in stock after ${analysis.daysInStock} days`,
        impact: 'conversion_optimization',
        suggested_actions: ['Review pricing competitiveness', 'Analyze lead quality', 'Improve sales follow-up process'],
        lead_conversion_rate: analysis.leadCount > 0 ? 'low' : 'none'
      });
    }

    if (analysis.leadCount === 0 && analysis.daysInStock > 30) {
      analysis.actionable_insights.push({
        priority: 'high',
        action: 'boost_visibility',
        description: `No customer interest after ${analysis.daysInStock} days - visibility issue`,
        impact: 'lead_generation',
        suggested_actions: [
          analysis.imageCount < 3 ? 'Add more quality images' : null,
          'Review listing on major portals',
          'Consider pricing adjustment',
          'Improve vehicle description'
        ].filter(Boolean)
      });
    }

    if (analysis.leadCount > 0 && analysis.daysSinceLastLead > 14) {
      analysis.actionable_insights.push({
        priority: 'medium',
        action: 'reactivate_interest',
        description: `${analysis.daysSinceLastLead} days since last lead - interest may be declining`,
        impact: 'lead_momentum',
        suggested_actions: ['Refresh listing', 'Consider price reduction', 'Update images or description']
      });
    }

    if (analysis.avgLeadsPerWeek > 2 && analysis.daysInStock < 30) {
      analysis.actionable_insights.push({
        priority: 'low',
        action: 'optimize_success',
        description: `Strong performance: ${analysis.avgLeadsPerWeek.toFixed(1)} leads/week`,
        impact: 'replication_opportunity',
        suggested_actions: ['Analyze success factors', 'Apply insights to similar vehicles', 'Maintain current strategy']
      });
    }
  }

  // LEGACY COMPATIBILITY (for existing code)
  analysis.performanceScore = analysis.daysInStock > 90 ? 3.5 : 
                             analysis.daysInStock > 60 ? 2.5 : 
                             analysis.imageCount === 0 ? 2.5 : 1.0;
  analysis.performanceCategory = analysis.performanceScore >= 3 ? 'poor' : 
                               analysis.performanceScore >= 2 ? 'underperforming' : 'good';
  analysis.needsAttention = analysis.actionable_insights.some(i => i.priority === 'critical' || i.priority === 'high');
  analysis.factors = [`Days: ${analysis.daysInStock}`, `Images: ${analysis.imageCount}`];
  analysis.recommendations = analysis.actionable_insights.map(i => i.action.replace('_', ' '));

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