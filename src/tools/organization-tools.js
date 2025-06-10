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

module.exports = { organizationTools };