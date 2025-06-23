const { performanceData } = require('../utils/performance');

const performanceTools = [
  {
    name: "get_mcp_performance",
    description: `Check MCP performance metrics with objective benchmarks and optimization opportunities
    
When to use: Monitor system health, identify bottlenecks, optimize workflows. This tool is for developers & system admins only. Only use when specifically asked for.
Returns: Performance stats with benchmarks, error rates, and specific recommendations
Benchmark context: API calls <1s (excellent), 1-2s (good), 2-5s (acceptable), >5s (needs optimization)`,
    inputSchema: {
      type: "object",
      properties: {
        detailed: {
          type: "boolean",
          description: "Include detailed operation breakdown and timing analysis",
          default: false
        }
      }
    },
    handler: async (params = {}) => {
      const recent = performanceData.operations.slice(-50);
      const last20 = recent.slice(-20);
      
      if (recent.length === 0) {
        return {
          status: "no_data",
          message: "No operations tracked yet - performance monitoring starts after first tool use",
          recommendations: ["Start using MCP tools to collect performance data"]
        };
      }
      
      const byTool = {};
      
      // Calculate comprehensive stats
      recent.forEach(op => {
        if (!byTool[op.tool]) {
          byTool[op.tool] = { 
            total: 0, 
            count: 0, 
            errors: 0, 
            operations: [],
            minTime: Infinity,
            maxTime: 0
          };
        }
        byTool[op.tool].total += op.duration;
        byTool[op.tool].count++;
        byTool[op.tool].operations.push(op.duration);
        byTool[op.tool].minTime = Math.min(byTool[op.tool].minTime, op.duration);
        byTool[op.tool].maxTime = Math.max(byTool[op.tool].maxTime, op.duration);
        if (!op.success) byTool[op.tool].errors++;
      });
      
      // Performance classification thresholds (based on API best practices)
      const classifyPerformance = (avgMs) => {
        if (avgMs < 1000) return { level: "excellent", color: "🟢" };
        if (avgMs < 2000) return { level: "good", color: "🟡" };
        if (avgMs < 5000) return { level: "acceptable", color: "🟠" };
        return { level: "needs_optimization", color: "🔴" };
      };
      
      const stats = Object.entries(byTool).map(([tool, data]) => {
        const avgMs = Math.round(data.total / data.count);
        const performance = classifyPerformance(avgMs);
        
        return {
          tool,
          avg_ms: avgMs,
          min_ms: data.minTime,
          max_ms: data.maxTime,
          calls: data.count,
          errors: data.errors,
          error_rate: ((data.errors / data.count) * 100).toFixed(1) + '%',
          performance_level: performance.level,
          indicator: performance.color
        };
      }).sort((a, b) => b.avg_ms - a.avg_ms);
      
      // Generate objective recommendations
      const recommendations = [];
      const optimizations = [];
      
      // Analyze performance patterns
      const slowTools = stats.filter(s => s.avg_ms > 5000);
      const errorProneTools = stats.filter(s => s.errors > 0);
      const frequentTools = stats.filter(s => s.calls >= 10);
      
      // Specific optimization recommendations
      slowTools.forEach(tool => {
        if (tool.tool.includes('upload_vehicle_images')) {
          optimizations.push({
            tool: tool.tool,
            issue: `${tool.avg_ms}ms average (${tool.performance_level})`,
            solution: "Use upload_vehicle_images_claude for Claude UI images (70% faster)",
            impact: "high"
          });
        } else if (tool.tool.includes('get_vehicle') || tool.tool.includes('list_vehicles')) {
          optimizations.push({
            tool: tool.tool,
            issue: `${tool.avg_ms}ms average (${tool.performance_level})`,
            solution: "Consider adding filters to reduce dataset size or implement caching",
            impact: "medium"
          });
        } else if (tool.tool.includes('analytics') || tool.tool.includes('underperforming')) {
          optimizations.push({
            tool: tool.tool,
            issue: `${tool.avg_ms}ms average (${tool.performance_level})`,
            solution: "Analytics tools process large datasets - use smaller limit parameters",
            impact: "medium"
          });
        } else {
          optimizations.push({
            tool: tool.tool,
            issue: `${tool.avg_ms}ms average (${tool.performance_level})`,
            solution: "Check network connectivity and API endpoint health",
            impact: "unknown"
          });
        }
      });
      
      errorProneTools.forEach(tool => {
        optimizations.push({
          tool: tool.tool,
          issue: `${tool.error_rate} error rate (${tool.errors}/${tool.calls} calls)`,
          solution: "Review error logs for authentication, validation, or data issues",
          impact: "high"
        });
      });
      
      frequentTools.forEach(tool => {
        if (tool.tool.includes('get_vehicle') && tool.calls >= 20) {
          optimizations.push({
            tool: tool.tool,
            issue: `High frequency: ${tool.calls} calls`,
            solution: "Consider batching requests or caching vehicle data",
            impact: "medium"
          });
        }
      });
      
      // Overall system health assessment
      const totalErrors = recent.filter(op => !op.success).length;
      const errorRate = (totalErrors / recent.length * 100).toFixed(1);
      const avgResponseTime = Math.round(recent.reduce((sum, op) => sum + op.duration, 0) / recent.length);
      const systemHealth = classifyPerformance(avgResponseTime);
      
      // Business impact insights
      const businessInsights = [];
      if (parseFloat(errorRate) > 5) {
        businessInsights.push("High error rate may impact user experience and workflow completion");
      }
      if (avgResponseTime > 3000) {
        businessInsights.push("Slow response times may delay vehicle processing and reduce productivity");
      }
      if (optimizations.filter(o => o.impact === "high").length > 0) {
        businessInsights.push("High-impact optimizations available - implementing them could significantly improve performance");
      }
      
      const result = {
        system_health: {
          status: systemHealth.level,
          indicator: systemHealth.color,
          avg_response_time_ms: avgResponseTime,
          error_rate: errorRate + '%',
          total_operations: recent.length,
          time_window: "last 50 operations"
        },
        tool_performance: stats.slice(0, 10), // Top 10 by response time
        optimizations: optimizations.slice(0, 5), // Top 5 recommendations
        business_impact: businessInsights
      };
      
      // Add detailed breakdown if requested
      if (params.detailed) {
        result.detailed_analysis = {
          performance_distribution: {
            excellent: stats.filter(s => s.performance_level === "excellent").length,
            good: stats.filter(s => s.performance_level === "good").length,
            acceptable: stats.filter(s => s.performance_level === "acceptable").length,
            needs_optimization: stats.filter(s => s.performance_level === "needs_optimization").length
          },
          recent_trend: {
            operations: last20.length,
            avg_time: Math.round(last20.reduce((sum, op) => sum + op.duration, 0) / last20.length),
            errors: last20.filter(op => !op.success).length
          },
          top_slow_operations: recent
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5)
            .map(op => ({
              tool: op.tool,
              duration_ms: op.duration,
              success: op.success,
              timestamp: new Date(op.timestamp).toISOString()
            }))
        };
      }
      
      // Return in MCP format for proper agent communication
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  }
];

module.exports = { performanceTools };