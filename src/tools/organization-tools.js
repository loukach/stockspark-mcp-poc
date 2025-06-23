/**
 * Organization Management Tools
 * Tools for company and dealer selection in multi-tenant environments
 */

const organizationTools = [
  {
    name: "get_user_context",
    description: "Get current organization context (selected company and dealer). Use this to check which company/dealer is currently active.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  {
    name: "list_user_companies", 
    description: "List all companies the user has access to. Use this when you need to select a different company or see available options.",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Country code (it, fr, de, es). Defaults to user's locale or 'it'",
          enum: ["it", "fr", "de", "es"]
        }
      }
    }
  },

  {
    name: "select_company",
    description: "Select a specific company to work with. Required when user has access to multiple companies.",
    inputSchema: {
      type: "object", 
      properties: {
        companyId: {
          type: "number",
          description: "Company ID to select"
        },
        country: {
          type: "string",
          description: "Country code (it, fr, de, es)",
          enum: ["it", "fr", "de", "es"]
        }
      },
      required: ["companyId"]
    }
  },

  {
    name: "list_company_dealers",
    description: "List all dealers for the selected company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "number",
          description: "Company ID (uses current if not provided)"
        }
      }
    }
  },

  {
    name: "select_dealer",
    description: "Select a specific dealer within the current company",
    inputSchema: {
      type: "object",
      properties: {
        dealerId: {
          type: "number",
          description: "Dealer ID to select"
        }
      },
      required: ["dealerId"]
    }
  }
];

const organizationHandlers = {
  get_user_context: async (args, { organizationAPI }) => {
    const context = organizationAPI.getCurrentContext();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            hasContext: !!(context.companyId && context.dealerId),
            company: context.companyName ? {
              id: context.companyId,
              name: context.companyName,
              country: context.country
            } : null,
            dealer: context.dealerName ? {
              id: context.dealerId,
              name: context.dealerName
            } : null,
            status: context.companyId && context.dealerId 
              ? 'Ready for vehicle operations'
              : 'Company/dealer selection required'
          }, null, 2),
        },
      ],
    };
  },

  list_user_companies: async (args, { organizationAPI }) => {
    try {
      const companies = await organizationAPI.listCompanies(args.country);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(companies, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list companies: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  select_company: async (args, { organizationAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
    validateRequired(args.companyId, 'companyId');
    
    try {
      await organizationAPI.selectCompany(args.companyId, args.country);
      const context = organizationAPI.getCurrentContext();
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Company selected: ${context.companyName} (ID: ${context.companyId})\n\n📋 Next step: Use list_company_dealers and select_dealer to complete setup`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to select company: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  list_company_dealers: async (args, { organizationAPI }) => {
    try {
      const context = organizationAPI.getCurrentContext();
      const companyId = args.companyId || context.companyId;
      
      if (!companyId) {
        throw new Error('No company selected. Use list_user_companies and select_company first.');
      }
      
      const dealers = await organizationAPI.listDealers(companyId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(dealers, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list dealers: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  select_dealer: async (args, { organizationAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
    validateRequired(args.dealerId, 'dealerId');
    
    try {
      const context = organizationAPI.getCurrentContext();
      if (!context.companyId) {
        throw new Error('No company selected. Use list_user_companies and select_company first.');
      }
      
      await organizationAPI.selectDealer(args.dealerId);
      const updatedContext = organizationAPI.getCurrentContext();
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Organization setup complete!\n🏢 Company: ${updatedContext.companyName}\n🏪 Dealer: ${updatedContext.dealerName}\n\n🚀 Ready for vehicle operations (create_vehicle, list_vehicles, etc.)`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to select dealer: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
};

module.exports = { organizationTools, organizationHandlers };