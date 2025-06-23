const { logger } = require('../utils/logger');
const { ApiError } = require('../utils/errors');

async function makeLeadsApiRequest(endpoint, options = {}) {
  const { method = 'GET', headers = {}, timeout = 30000 } = options;
  
  const url = `https://api.dealerk.it/v2${endpoint}`;
  
  try {
    // Log the API request using the same format as StockSpark API
    logger.apiRequest(method, url, null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Log the API response using the same format as StockSpark API
    logger.apiResponse(response.status, response.statusText, url);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Leads API error: ${response.status} ${response.statusText} - ${errorText}`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        response: errorText
      });
      throw new ApiError(
        `Leads API request failed: ${response.statusText}`,
        response.status,
        { endpoint, response: errorText }
      );
    }
    
    const data = await response.json();
    
    // Handle Dealer.K API response structure - leads are nested in response.response
    let leads;
    if (data && data.response && Array.isArray(data.response)) {
      leads = data.response;
      logger.info(`Leads API returned ${leads.length} leads from nested response structure`);
    } else if (Array.isArray(data)) {
      leads = data;
      logger.info(`Leads API returned ${leads.length} leads from direct array`);
    } else {
      logger.warn('Unexpected leads API response format', { 
        responseStructure: typeof data,
        hasResponse: data && typeof data.response !== 'undefined',
        responseType: data && data.response ? typeof data.response : 'undefined'
      });
      leads = [];
    }
    
    return leads;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error(`Leads API request timeout: ${url}`);
      throw new ApiError('Leads API request timed out', 408, { endpoint });
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    logger.error(`Leads API request failed: ${error.message}`, error);
    throw new ApiError(
      'Failed to connect to leads API',
      500,
      { endpoint, originalError: error.message }
    );
  }
}

async function getLeads(params = {}) {
  const apiKey = process.env.STOCKSPARK_API_KEY;
  
  if (!apiKey) {
    throw new ApiError(
      'STOCKSPARK_API_KEY environment variable is required for leads API access',
      401,
      { required_env: 'STOCKSPARK_API_KEY' }
    );
  }
  
  const { dateFrom, dateTo, format = 'json' } = params;
  
  // Validate date format if provided
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    throw new ApiError('dateFrom must be in YYYY-MM-DD format', 400, { dateFrom });
  }
  
  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    throw new ApiError('dateTo must be in YYYY-MM-DD format', 400, { dateTo });
  }
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.append('dateFrom', dateFrom);
  if (dateTo) queryParams.append('dateTo', dateTo);
  if (format !== 'json') queryParams.append('format', format);
  
  const endpoint = `/${apiKey}/lead/list${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  try {
    logger.info(`Fetching leads from Dealer.K API${dateFrom ? ` from ${dateFrom}` : ''}${dateTo ? ` to ${dateTo}` : ''}`, {
      dateFrom,
      dateTo,
      format,
      apiEndpoint: endpoint
    });
    
    const response = await makeLeadsApiRequest(endpoint);
    
    // Log detailed lead statistics for monitoring
    if (Array.isArray(response)) {
      logger.info(`Successfully retrieved ${response.length} leads from Dealer.K API`, {
        leadCount: response.length,
        dateRange: { from: dateFrom, to: dateTo },
        format
      });
    } else if (response && typeof response === 'object') {
      logger.info('Retrieved leads data object from Dealer.K API', {
        responseType: typeof response,
        dateRange: { from: dateFrom, to: dateTo },
        format
      });
    } else {
      logger.warn('Unexpected leads API response format', {
        responseType: typeof response,
        response
      });
    }
    
    return response;
    
  } catch (error) {
    logger.error('Failed to retrieve leads', error);
    throw error;
  }
}

async function getLeadsForVehicle(vehicleId, params = {}, preloadedLeads = null) {
  if (!vehicleId) {
    throw new ApiError('Vehicle ID is required', 400, { vehicleId });
  }
  
  try {
    logger.info(`Filtering leads for specific vehicle ${vehicleId}`, {
      vehicleId,
      dateFilters: params,
      usingPreloadedLeads: !!preloadedLeads
    });
    
    let allLeads;
    
    if (preloadedLeads && Array.isArray(preloadedLeads)) {
      // Use preloaded leads to avoid redundant API call
      logger.info(`Using preloaded leads data to avoid redundant API call`, {
        preloadedCount: preloadedLeads.length,
        vehicleId
      });
      allLeads = preloadedLeads;
    } else {
      // Get all leads from API (the API doesn't seem to support vehicle-specific filtering)
      logger.info(`Fetching leads from API for vehicle ${vehicleId} filtering`);
      allLeads = await getLeads(params);
    }
    
    if (!Array.isArray(allLeads)) {
      logger.warn('Unexpected leads API response format for vehicle filtering', { 
        vehicleId,
        response: allLeads 
      });
      return [];
    }
    
    logger.debug(`Filtering ${allLeads.length} total leads for vehicle ${vehicleId}`);
    
    // Filter leads for specific vehicle
    // Based on actual API response structure: vehicle_id is the field name
    const vehicleLeads = allLeads.filter(lead => {
      return lead.vehicle_id === vehicleId || 
             lead.vehicleId === vehicleId ||
             lead.stockNumber === vehicleId ||
             lead.stock_number === vehicleId;
    });
    
    logger.info(`Found ${vehicleLeads.length} leads for vehicle ${vehicleId}`, {
      vehicleId,
      leadCount: vehicleLeads.length,
      totalLeadsSearched: allLeads.length,
      filterCriteria: ['vehicleId', 'vehicle_id', 'stockNumber', 'stock_number'],
      apiCallAvoided: !!preloadedLeads
    });
    
    return vehicleLeads;
    
  } catch (error) {
    logger.error(`Failed to get leads for vehicle ${vehicleId}`, error);
    throw error;
  }
}

async function getLeadsTrends(params = {}) {
  const { timeframe = 'month', groupBy = 'day' } = params;
  
  try {
    // Calculate date range based on timeframe
    const now = new Date();
    let dateFrom;
    
    switch (timeframe) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const dateFromStr = dateFrom.toISOString().split('T')[0];
    const dateToStr = now.toISOString().split('T')[0];
    
    logger.info(`Analyzing lead trends for ${timeframe} timeframe`, {
      timeframe,
      groupBy,
      dateRange: { from: dateFromStr, to: dateToStr }
    });
    
    const leads = await getLeads({ 
      dateFrom: dateFromStr, 
      dateTo: dateToStr 
    });
    
    if (!Array.isArray(leads)) {
      return { trends: [], summary: { total: 0, timeframe, groupBy } };
    }
    
    // Group leads by date/time period
    const groupedLeads = {};
    
    leads.forEach(lead => {
      // Use dateCreated field from Dealer.K API format: "2025-06-23 18:19:17"
      const leadDate = new Date(lead.dateCreated || lead.created_at || lead.date || lead.createdAt);
      
      // Skip invalid dates
      if (isNaN(leadDate.getTime())) {
        logger.warn('Invalid lead date encountered', { 
          leadId: lead.id, 
          dateCreated: lead.dateCreated 
        });
        return;
      }
      
      let groupKey;
      
      if (groupBy === 'day') {
        groupKey = leadDate.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(leadDate);
        weekStart.setDate(leadDate.getDate() - leadDate.getDay());
        groupKey = weekStart.toISOString().split('T')[0];
      }
      
      if (!groupedLeads[groupKey]) {
        groupedLeads[groupKey] = [];
      }
      groupedLeads[groupKey].push(lead);
    });
    
    // Convert to trends array
    const trends = Object.entries(groupedLeads)
      .map(([date, dateLeads]) => ({
        date,
        count: dateLeads.length,
        leads: dateLeads
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const result = {
      trends,
      summary: {
        total: leads.length,
        timeframe,
        groupBy,
        avgPerPeriod: leads.length / trends.length || 0,
        dateRange: { from: dateFromStr, to: dateToStr }
      }
    };
    
    logger.info(`Lead trends analysis completed`, {
      totalLeads: leads.length,
      trendsCount: trends.length,
      avgPerPeriod: result.summary.avgPerPeriod,
      timeframe,
      groupBy
    });
    
    return result;
    
  } catch (error) {
    logger.error('Failed to get leads trends', error);
    throw error;
  }
}

module.exports = {
  getLeads,
  getLeadsForVehicle, 
  getLeadsTrends,
  makeLeadsApiRequest
};