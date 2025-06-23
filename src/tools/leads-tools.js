const { getLeads, getLeadsForVehicle, getLeadsTrends } = require('../api/leads');
const { logger } = require('../utils/logger');
const { ApiError } = require('../utils/errors');

const leadsTools = [
  {
    name: "get_vehicle_leads",
    description: `Get customer leads for specific vehicles or date ranges

When to use: Analyze customer interest, correlate inquiries with vehicle performance
Lead data: Contact info, inquiry dates, vehicle interest, source tracking
Returns: Detailed lead information with vehicle correlation

Options: Filter by vehicle, date range, lead source
Pro tip: Use with vehicle analytics to identify high-interest/low-conversion vehicles
Next steps: correlate_leads_performance or update pricing based on lead volume`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: {
          type: "number",
          description: "Specific vehicle ID to get leads for (optional - omit for all leads)"
        },
        dateFrom: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Start date for lead search (YYYY-MM-DD format)"
        },
        dateTo: {
          type: "string", 
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "End date for lead search (YYYY-MM-DD format)"
        },
        includeMetrics: {
          type: "boolean",
          default: true,
          description: "Include lead summary metrics and statistics"
        },
        format: {
          type: "string",
          enum: ["json", "csv", "xml"],
          default: "json",
          description: "Response format (json recommended for AI analysis)"
        }
      }
    }
  },

  {
    name: "analyze_lead_trends",
    description: `Analyze lead generation trends and patterns over time

When to use: Identify seasonal patterns, marketing effectiveness, customer behavior trends
Analysis: Lead volume trends, source performance, vehicle interest patterns
Returns: Trend data with insights and recommendations

Timeframes: week, month, quarter
Grouping: day, week for detailed analysis
Use for: Marketing optimization, inventory planning, sales forecasting`,
    inputSchema: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["week", "month", "quarter"],
          default: "month",
          description: "Time period to analyze"
        },
        groupBy: {
          type: "string", 
          enum: ["day", "week"],
          default: "day",
          description: "How to group the trend data"
        },
        includeInsights: {
          type: "boolean",
          default: true,
          description: "Include AI-generated insights and recommendations"
        },
        minLeadsThreshold: {
          type: "number",
          default: 1,
          description: "Minimum leads per period to include in analysis"
        }
      }
    }
  }
];

const leadsHandlers = {
  get_vehicle_leads: async (args, { logger }) => {
    const { vehicleId, dateFrom, dateTo, includeMetrics = true, format = "json" } = args;
    
    try {
      let leads;
      
      if (vehicleId) {
        // Get leads for specific vehicle
        leads = await getLeadsForVehicle(vehicleId, { dateFrom, dateTo, format });
      } else {
        // Get all leads for date range
        leads = await getLeads({ dateFrom, dateTo, format });
      }
      
      if (format !== 'json') {
        // Return raw data for CSV/XML formats
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                format,
                data: leads,
                message: `Leads data exported in ${format} format`
              }, null, 2)
            }
          ]
        };
      }
      
      // Process JSON response
      if (!Array.isArray(leads)) {
        logger.warn('Unexpected leads API response format', { leads });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                leads: [],
                metrics: { total: 0, message: "No leads data available" }
              }, null, 2)
            }
          ]
        };
      }
      
      let result = {
        leads: leads.map(lead => ({
          id: lead.id,
          vehicleId: lead.vehicle_id || lead.vehicleId || lead.stockNumber,
          customerName: `${lead.nome || ''} ${lead.surname || ''}`.trim() || lead.customerName || lead.customer_name,
          email: lead.email,
          phone: lead.phone || lead.cellphone,
          message: lead.note || lead.message || lead.inquiry,
          source: lead.channel || lead.source || lead.lead_source,
          createdAt: lead.dateCreated || lead.created_at || lead.date || lead.createdAt,
          status: lead.qualified ? 'qualified' : 'active',
          vehicleInfo: {
            make: lead.maker || lead.vehicleMake || lead.make,
            model: lead.model || lead.vehicleModel,
            version: lead.version || lead.vehicleVersion,
            type: lead.type || lead.vehicleType,
            price: lead.price
          },
          dealerInfo: {
            dealerId: lead.dealer_id,
            dealerName: lead.dealer_name,
            dealerAddress: lead.dealer_address,
            dealerCity: lead.dealer_city
          },
          formInfo: {
            formName: lead.form_name,
            formCode: lead.form_code
          }
        }))
      };
      
      if (includeMetrics) {
        // Calculate lead metrics using dateCreated field
        const now = new Date();
        const last7Days = leads.filter(lead => {
          const leadDate = new Date(lead.dateCreated || lead.created_at || lead.date || lead.createdAt);
          return !isNaN(leadDate.getTime()) && (now - leadDate) <= 7 * 24 * 60 * 60 * 1000;
        }).length;
        
        const last30Days = leads.filter(lead => {
          const leadDate = new Date(lead.dateCreated || lead.created_at || lead.date || lead.createdAt);
          return !isNaN(leadDate.getTime()) && (now - leadDate) <= 30 * 24 * 60 * 60 * 1000;
        }).length;
        
        // Group by vehicle using vehicle_id from Dealer.K API
        const vehicleLeadCount = {};
        leads.forEach(lead => {
          const vId = lead.vehicle_id || lead.vehicleId || lead.stockNumber;
          if (vId) {
            vehicleLeadCount[vId] = (vehicleLeadCount[vId] || 0) + 1;
          }
        });
        
        result.metrics = {
          total: leads.length,
          last7Days,
          last30Days,
          avgPerDay: last7Days / 7,
          avgPerWeek: last30Days / 4.3,
          vehicleWithMostLeads: Object.keys(vehicleLeadCount).length > 0 ? 
            Object.entries(vehicleLeadCount).sort(([,a], [,b]) => b - a)[0] : null,
          uniqueVehicles: Object.keys(vehicleLeadCount).length,
          leadsPerVehicle: Object.keys(vehicleLeadCount).length > 0 ? 
            leads.length / Object.keys(vehicleLeadCount).length : 0
        };
        
        // Add source breakdown using channel field from Dealer.K API
        const sourceBreakdown = {};
        leads.forEach(lead => {
          const source = lead.channel || lead.source || lead.lead_source || 'unknown';
          sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
        });
        
        if (Object.keys(sourceBreakdown).length > 0) {
          result.metrics.sourceBreakdown = sourceBreakdown;
        }
      }
      
      logger.info(`Retrieved ${leads.length} leads${vehicleId ? ` for vehicle ${vehicleId}` : ''}`);
      
      // Add a success message to make it clear to the agent
      result.success = true;
      result.message = `Successfully retrieved ${leads.length} lead${leads.length === 1 ? '' : 's'}${vehicleId ? ` for vehicle ${vehicleId}` : ''}`;
      
      // Add performance note to help users optimize their calls
      if (leads.length > 0) {
        result.performanceNote = `API call completed successfully. To avoid redundant calls, consider using the returned data for multiple analyses instead of re-fetching.`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
      
    } catch (error) {
      logger.error('Failed to get vehicle leads', error);
      
      const errorMessage = `Failed to retrieve vehicle leads: ${error.message}`;
      
      return {
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ],
        isError: true
      };
    }
  },

  analyze_lead_trends: async (args, { logger }) => {
    const { 
      timeframe = "month", 
      groupBy = "day", 
      includeInsights = true,
      minLeadsThreshold = 1 
    } = args;
    
    try {
      const trendsData = await getLeadsTrends({ timeframe, groupBy });
      
      // Filter out periods below threshold
      const filteredTrends = trendsData.trends.filter(trend => 
        trend.count >= minLeadsThreshold
      );
      
      let result = {
        trends: filteredTrends,
        summary: trendsData.summary,
        timeframe,
        groupBy
      };
      
      if (includeInsights && filteredTrends.length > 0) {
        // Generate insights
        const counts = filteredTrends.map(t => t.count);
        const avgLeads = counts.reduce((a, b) => a + b, 0) / counts.length;
        const maxLeads = Math.max(...counts);
        const minLeads = Math.min(...counts);
        const variance = counts.reduce((acc, count) => acc + Math.pow(count - avgLeads, 2), 0) / counts.length;
        const stdDev = Math.sqrt(variance);
        
        // Find peak and low periods
        const peakPeriod = filteredTrends.find(t => t.count === maxLeads);
        const lowPeriod = filteredTrends.find(t => t.count === minLeads);
        
        // Calculate trend direction
        const firstHalf = filteredTrends.slice(0, Math.floor(filteredTrends.length / 2));
        const secondHalf = filteredTrends.slice(Math.floor(filteredTrends.length / 2));
        const firstHalfAvg = firstHalf.reduce((sum, t) => sum + t.count, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, t) => sum + t.count, 0) / secondHalf.length;
        const trendDirection = secondHalfAvg > firstHalfAvg ? 'increasing' : 
                              secondHalfAvg < firstHalfAvg ? 'decreasing' : 'stable';
        
        result.insights = {
          trendDirection,
          consistency: stdDev / avgLeads < 0.3 ? 'consistent' : 'variable',
          averageLeadsPerPeriod: Math.round(avgLeads * 10) / 10,
          peakPeriod: {
            date: peakPeriod.date,
            count: peakPeriod.count,
            percentAboveAverage: Math.round(((maxLeads - avgLeads) / avgLeads) * 100)
          },
          lowPeriod: {
            date: lowPeriod.date,
            count: lowPeriod.count,
            percentBelowAverage: Math.round(((avgLeads - minLeads) / avgLeads) * 100)
          }
        };
        
        // Generate recommendations
        result.recommendations = [];
        
        if (trendDirection === 'decreasing') {
          result.recommendations.push({
            priority: 'high',
            action: 'investigate_decline',
            description: `Lead volume is decreasing over ${timeframe}`,
            suggestions: ['Review marketing campaigns', 'Check website performance', 'Analyze competitor activity']
          });
        }
        
        if (stdDev / avgLeads > 0.5) {
          result.recommendations.push({
            priority: 'medium',
            action: 'stabilize_lead_flow',
            description: 'Lead generation is highly variable',
            suggestions: ['Implement consistent marketing schedule', 'Diversify lead sources', 'Create lead generation baseline']
          });
        }
        
        if (maxLeads > avgLeads * 2) {
          result.recommendations.push({
            priority: 'low',
            action: 'replicate_success',
            description: `Peak period (${peakPeriod.date}) had ${maxLeads} leads`,
            suggestions: ['Analyze successful period factors', 'Replicate winning strategies', 'Scale effective campaigns']
          });
        }
      }
      
      logger.info(`Analyzed lead trends for ${timeframe} period with ${filteredTrends.length} data points`);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
      
    } catch (error) {
      logger.error('Failed to analyze lead trends', error);
      
      const errorMessage = `Failed to analyze lead trends: ${error.message}`;
      
      return {
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ],
        isError: true
      };
    }
  }
};

module.exports = { leadsTools, leadsHandlers };