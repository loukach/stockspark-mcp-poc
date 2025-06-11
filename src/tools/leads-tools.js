const { ValidationError } = require('../utils/errors');
const { logger } = require('../utils/logger');

const leadsTools = [
  {
    name: 'list_leads',
    description: 'PREFERRED FOR ANALYSIS: Get complete lead dataset for trend analysis, comparisons, and insights. Returns raw data that Claude can analyze comprehensively rather than pre-formatted summaries. Use this instead of get_lead_statistics for analytical tasks. ⚠️ WARNING: Currently only works with "Motork Demo" company due to API credential limitations.',
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom: {
          type: 'string',
          description: 'Start date for lead search (YYYY-MM-DD format)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        dateTo: {
          type: 'string',
          description: 'End date for lead search (YYYY-MM-DD format)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        companyId: {
          type: 'string',
          description: 'Company ID (optional - uses selected company if not specified)'
        }
      },
      required: ['dateFrom', 'dateTo']
    }
  },
  {
    name: 'search_leads_by_type',
    description: 'Search leads by type (e.g., rent, sale, service). ⚠️ WARNING: Currently only works with "Motork Demo" company due to API credential limitations.',
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom: {
          type: 'string',
          description: 'Start date for lead search (YYYY-MM-DD format)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        dateTo: {
          type: 'string',
          description: 'End date for lead search (YYYY-MM-DD format)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        typeCode: {
          type: 'string',
          description: 'Lead type code (e.g., rent, sale, service)',
          enum: ['rent', 'sale', 'service', 'used', 'new']
        },
        companyId: {
          type: 'string',
          description: 'Company ID (optional - uses selected company if not specified)'
        }
      },
      required: ['dateFrom', 'dateTo', 'typeCode']
    }
  },
  {
    name: 'get_lead_statistics',
    description: 'DISCOURAGED FOR ANALYSIS: Returns pre-formatted statistics. For trending/analysis questions, use list_leads instead to get raw data for comprehensive Claude analysis. ⚠️ WARNING: Currently only works with "Motork Demo" company due to API credential limitations.',
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom: {
          type: 'string',
          description: 'Start date for lead search (YYYY-MM-DD format)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        dateTo: {
          type: 'string',
          description: 'End date for lead search (YYYY-MM-DD format)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        companyId: {
          type: 'string',
          description: 'Company ID (optional - uses selected company if not specified)'
        }
      },
      required: ['dateFrom', 'dateTo']
    }
  }
];

const createLeadsHandlers = (leadsAPI, organizationAPI) => ({
  list_leads: async (args) => {
    try {
      const { dateFrom, dateTo, companyId } = args;
      
      // Get company context (dealer not required for leads)
      let targetCompanyId = companyId;
      if (!targetCompanyId) {
        const context = organizationAPI.getCurrentContext();
        if (!context.companyId) {
          throw new Error('No company selected. Use list_user_companies and select_company first.');
        }
        targetCompanyId = context.companyId;
      }
      
      logger.info('list_leads called', { dateFrom, dateTo, companyId: targetCompanyId });
      
      const result = await leadsAPI.listLeads({
        dateFrom,
        dateTo,
        companyId: targetCompanyId
      });
      
      // Create slim leads for analysis (essential fields only)
      const slimLeads = result.leads.map(lead => ({
        dateCreated: lead.dateCreated,
        typeCode: lead.typeCode || lead.type,
        vehicle: {
          maker: lead.vehicle?.maker,
          model: lead.vehicle?.model,
          version: lead.vehicle?.version || lead.vehicle?.trim,
          price: lead.vehicle?.price
        },
        qualified: lead.qualified,
        channel: lead.channel,
        company: lead.company?.name,
        formCode: lead.form?.code
      }));

      // Calculate monthly breakdown for summary
      const monthlyBreakdown = {};
      const typeBreakdown = {};
      
      slimLeads.forEach(lead => {
        if (lead.dateCreated) {
          const month = lead.dateCreated.substring(0, 7); // YYYY-MM
          monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + 1;
        }
        
        if (lead.typeCode) {
          typeBreakdown[lead.typeCode] = (typeBreakdown[lead.typeCode] || 0) + 1;
        }
      });

      // Return structured data for Claude analysis
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              dateRange: { from: dateFrom, to: dateTo },
              summary: {
                totalCount: result.totalCount,
                returnedCount: slimLeads.length,
                byMonth: monthlyBreakdown,
                byType: typeBreakdown
              },
              leads: slimLeads,
              note: `Optimized dataset with essential fields for analysis. ${result.totalCount} total leads, showing ${slimLeads.length} with key data points.`
            }, null, 2)
          },
        ],
      };
    } catch (error) {
      logger.error('list_leads failed', error);
      throw error;
    }
  },

  search_leads_by_type: async (args) => {
    try {
      const { dateFrom, dateTo, typeCode, companyId } = args;
      
      // Get company context (dealer not required for leads)
      let targetCompanyId = companyId;
      if (!targetCompanyId) {
        const context = organizationAPI.getCurrentContext();
        if (!context.companyId) {
          throw new Error('No company selected. Use list_user_companies and select_company first.');
        }
        targetCompanyId = context.companyId;
      }
      
      logger.info('search_leads_by_type called', { dateFrom, dateTo, typeCode, companyId: targetCompanyId });
      
      const result = await leadsAPI.listLeads({
        dateFrom,
        dateTo,
        companyId: targetCompanyId
      });
      
      // Filter leads by type code
      const filteredLeads = result.leads.filter(lead => 
        lead.typeCode === typeCode || 
        (lead.type && lead.type.toLowerCase() === typeCode.toLowerCase())
      );
      
      // Format filtered leads for display
      let message = `🔍 Leads by Type: ${typeCode} (${dateFrom} to ${dateTo})\n\n`;
      message += `📋 Found: ${filteredLeads.length} leads of type '${typeCode}'\n`;
      message += `📊 Total leads in period: ${result.totalCount}\n\n`;
      
      if (filteredLeads.length > 0) {
        message += `📋 ${typeCode.toUpperCase()} Leads:\n`;
        filteredLeads.slice(0, 10).forEach((lead, index) => {
          message += `\n${index + 1}. ${lead.name || 'N/A'}\n`;
          message += `   📧 ${lead.email || 'N/A'}\n`;
          message += `   📱 ${lead.phone || 'N/A'}\n`;
          message += `   🚗 ${lead.vehicle?.maker} ${lead.vehicle?.model || 'N/A'}\n`;
          message += `   📅 ${lead.dateCreated || 'N/A'}\n`;
        });
        
        if (filteredLeads.length > 10) {
          message += `\n... and ${filteredLeads.length - 10} more ${typeCode} leads`;
        }
      } else {
        message += `No leads of type '${typeCode}' found in this date range.`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    } catch (error) {
      logger.error('search_leads_by_type failed', error);
      throw error;
    }
  },

  get_lead_statistics: async (args) => {
    try {
      const { dateFrom, dateTo, companyId } = args;
      
      // Get company context (dealer not required for leads)
      let targetCompanyId = companyId;
      if (!targetCompanyId) {
        const context = organizationAPI.getCurrentContext();
        if (!context.companyId) {
          throw new Error('No company selected. Use list_user_companies and select_company first.');
        }
        targetCompanyId = context.companyId;
      }
      
      logger.info('get_lead_statistics called', { dateFrom, dateTo, companyId: targetCompanyId });
      
      const result = await leadsAPI.listLeads({
        dateFrom,
        dateTo,
        companyId: targetCompanyId
      });
      
      // Calculate statistics
      const stats = {
        totalLeads: result.totalCount,
        dateRange: {
          from: dateFrom,
          to: dateTo
        },
        byType: {},
        byChannel: {},
        byMaker: {},
        byPrivacyConsent: {
          marketingMail: 0,
          marketingPhone: 0,
          marketingSms: 0,
          commercial: { yes: 0, no: 0, nd: 0 },
          financing: { yes: 0, no: 0, nd: 0 }
        },
        byCompany: {},
        byFormCode: {},
        qualified: {
          yes: 0,
          no: 0
        }
      };
      
      // Process each lead for statistics
      result.leads.forEach(lead => {
        // By type
        stats.byType[lead.typeCode || 'unknown'] = (stats.byType[lead.typeCode || 'unknown'] || 0) + 1;
        
        // By channel
        const channel = lead.channel || 'unknown';
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
        
        // By maker
        if (lead.vehicle && lead.vehicle.maker) {
          stats.byMaker[lead.vehicle.maker] = (stats.byMaker[lead.vehicle.maker] || 0) + 1;
        }
        
        // By privacy consent
        if (lead.privacy) {
          if (lead.privacy.marketingMail) stats.byPrivacyConsent.marketingMail++;
          if (lead.privacy.marketingPhone) stats.byPrivacyConsent.marketingPhone++;
          if (lead.privacy.marketingSms) stats.byPrivacyConsent.marketingSms++;
          
          // Commercial and financing privacy
          const commercialStatus = (lead.privacy.commercial || 'ND').toUpperCase();
          const financingStatus = (lead.privacy.financing || 'ND').toUpperCase();
          
          if (commercialStatus === 'SI') stats.byPrivacyConsent.commercial.yes++;
          else if (commercialStatus === 'NO') stats.byPrivacyConsent.commercial.no++;
          else stats.byPrivacyConsent.commercial.nd++;
          
          if (financingStatus === 'SI') stats.byPrivacyConsent.financing.yes++;
          else if (financingStatus === 'NO') stats.byPrivacyConsent.financing.no++;
          else stats.byPrivacyConsent.financing.nd++;
        }
        
        // By company
        if (lead.company) {
          const companyName = lead.company.name || 'unknown';
          stats.byCompany[companyName] = (stats.byCompany[companyName] || 0) + 1;
        }
        
        // By form code
        if (lead.form && lead.form.code) {
          stats.byFormCode[lead.form.code] = (stats.byFormCode[lead.form.code] || 0) + 1;
        }
        
        // Qualified leads
        if (lead.qualified) {
          stats.qualified.yes++;
        } else {
          stats.qualified.no++;
        }
      });
      
      // Format statistics for display
      let message = `📊 Lead Statistics Analysis (${dateFrom} to ${dateTo})\n\n`;
      message += `📋 Total Leads: ${stats.totalLeads}\n\n`;
      
      // Lead types
      if (Object.keys(stats.byType).length > 0) {
        message += `📈 By Lead Type:\n`;
        Object.entries(stats.byType)
          .sort((a, b) => b[1] - a[1])
          .forEach(([type, count]) => {
            const percentage = ((count / stats.totalLeads) * 100).toFixed(1);
            message += `   ${type}: ${count} (${percentage}%)\n`;
          });
        message += '\n';
      }
      
      // Vehicle makers
      if (Object.keys(stats.byMaker).length > 0) {
        message += `🚗 By Vehicle Maker:\n`;
        Object.entries(stats.byMaker)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([maker, count]) => {
            const percentage = ((count / stats.totalLeads) * 100).toFixed(1);
            message += `   ${maker}: ${count} (${percentage}%)\n`;
          });
        message += '\n';
      }
      
      // Privacy consent
      if (stats.totalLeads > 0) {
        message += `🔒 Privacy Consent:\n`;
        message += `   Email Marketing: ${stats.byPrivacyConsent.marketingMail}/${stats.totalLeads} (${((stats.byPrivacyConsent.marketingMail / stats.totalLeads) * 100).toFixed(1)}%)\n`;
        message += `   Phone Marketing: ${stats.byPrivacyConsent.marketingPhone}/${stats.totalLeads} (${((stats.byPrivacyConsent.marketingPhone / stats.totalLeads) * 100).toFixed(1)}%)\n`;
        message += `   SMS Marketing: ${stats.byPrivacyConsent.marketingSms}/${stats.totalLeads} (${((stats.byPrivacyConsent.marketingSms / stats.totalLeads) * 100).toFixed(1)}%)\n`;
        message += '\n';
      }
      
      // Form codes
      if (Object.keys(stats.byFormCode).length > 0) {
        message += `📝 By Form Type:\n`;
        Object.entries(stats.byFormCode)
          .sort((a, b) => b[1] - a[1])
          .forEach(([form, count]) => {
            const percentage = ((count / stats.totalLeads) * 100).toFixed(1);
            message += `   ${form}: ${count} (${percentage}%)\n`;
          });
        message += '\n';
      }
      
      // Qualified leads
      if (stats.totalLeads > 0) {
        message += `⭐ Lead Qualification:\n`;
        message += `   Qualified: ${stats.qualified.yes} (${((stats.qualified.yes / stats.totalLeads) * 100).toFixed(1)}%)\n`;
        message += `   Unqualified: ${stats.qualified.no} (${((stats.qualified.no / stats.totalLeads) * 100).toFixed(1)}%)\n`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    } catch (error) {
      logger.error('get_lead_statistics failed', error);
      throw error;
    }
  }
});

module.exports = { leadsTools, createLeadsHandlers };