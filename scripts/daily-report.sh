#!/bin/bash
# Daily Performance Report Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

BASE_URL="http://ec2-54-86-8-77.compute-1.amazonaws.com:3000"
EMAIL="admin@yourcompany.com"  # Replace with your email
REPORT_FILE="/tmp/sbc_daily_report_$(date +%Y%m%d).txt"

# Colors for console output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

generate_report() {
    echo "Generating daily performance report..."
    
    # Get current metrics
    local health_response
    local metrics_response
    local perf_health_response
    local top_routes_response
    local slow_requests_response
    
    health_response=$(curl -s --max-time 10 "$BASE_URL/health")
    metrics_response=$(curl -s --max-time 10 "$BASE_URL/api/performance/metrics")
    perf_health_response=$(curl -s --max-time 10 "$BASE_URL/api/performance/health")
    top_routes_response=$(curl -s --max-time 10 "$BASE_URL/api/performance/top-routes")
    slow_requests_response=$(curl -s --max-time 10 "$BASE_URL/api/performance/slow-requests")
    
    cat > "$REPORT_FILE" << EOF
Small Business Chatbot - Daily Performance Report
=================================================
Date: $(date '+%Y-%m-%d %H:%M:%S')
Report Period: Last 24 hours

EXECUTIVE SUMMARY
-----------------
Application Status: $(echo "$health_response" | jq -r '.status // "unknown"')
Performance Health: $(echo "$perf_health_response" | jq -r '.health.status // "unknown"')
Environment: $(echo "$health_response" | jq -r '.environment // "unknown"')
Version: $(echo "$health_response" | jq -r '.version // "unknown"')

KEY PERFORMANCE METRICS
------------------------
Total Requests Processed: $(echo "$metrics_response" | jq -r '.metrics.requests.total // "N/A"')
Average Response Time: $(echo "$metrics_response" | jq -r '.metrics.response_times.avg // "N/A"')ms
95th Percentile Response Time: $(echo "$metrics_response" | jq -r '.metrics.response_times.p95 // "N/A"')ms
99th Percentile Response Time: $(echo "$metrics_response" | jq -r '.metrics.response_times.p99 // "N/A"')ms
Error Rate: $(echo "$metrics_response" | jq -r '.metrics.errorRate // "N/A"')%
Requests per Second: $(echo "$metrics_response" | jq -r '.metrics.requestsPerSecond // "N/A"')

MEMORY UTILIZATION
------------------
Heap Used: $(echo "$metrics_response" | jq -r '.metrics.memory.heapUsed // "N/A"')
Heap Total: $(echo "$metrics_response" | jq -r '.metrics.memory.heapTotal // "N/A"')
RSS Memory: $(echo "$metrics_response" | jq -r '.metrics.memory.rss // "N/A"')
External Memory: $(echo "$metrics_response" | jq -r '.metrics.memory.external // "N/A"')

TRAFFIC ANALYSIS
----------------
Request Distribution by Method:
$(echo "$metrics_response" | jq -r '.metrics.requests.byMethod | to_entries[] | "  \(.key): \(.value) requests"' 2>/dev/null || echo "  Data not available")

Response Status Distribution:
$(echo "$metrics_response" | jq -r '.metrics.requests.byStatusCode | to_entries[] | "  HTTP \(.key): \(.value) responses"' 2>/dev/null || echo "  Data not available")

TOP ACCESSED ROUTES
-------------------
$(echo "$top_routes_response" | jq -r '.topRoutes[]? | "  \(.route): \(.count) requests"' 2>/dev/null || echo "  No route data available")

PERFORMANCE ISSUES
------------------
$(echo "$perf_health_response" | jq -r '.health.issues[]?' 2>/dev/null | sed 's/^/  - /' || echo "  No performance issues detected")

RECOMMENDATIONS
---------------
$(echo "$perf_health_response" | jq -r '.health.recommendations[]?' 2>/dev/null | sed 's/^/  - /' || echo "  No specific recommendations at this time")

SLOW REQUESTS (>500ms)
----------------------
$(echo "$slow_requests_response" | jq -r '.slowRequests[]? | "  \(.method) \(.route): \(.duration) (Memory: \(.memoryDiff))"' 2>/dev/null || echo "  No slow requests detected")

SYSTEM UPTIME
-------------
Application Uptime: $(echo "$metrics_response" | jq -r '.metrics.uptime.readable // "N/A"')
Last Deployment: $(echo "$health_response" | jq -r '.deploymentTime // "N/A"')

HEALTH CHECK SUMMARY
--------------------
Overall Health Status: $(echo "$health_response" | jq -r '.status // "unknown"')
Database Status: $(echo "$health_response" | jq -r '.services.database // "unknown"')
Vector Service Status: $(echo "$health_response" | jq -r '.services.vectorService // "unknown"')
Twilio Status: $(echo "$health_response" | jq -r '.services.twilio // "unknown"')

BUSINESS METRICS
----------------
$(curl -s --max-time 10 "$BASE_URL/api/businesses" | jq -r '.businesses | length' 2>/dev/null | sed 's/^/Active Businesses: /' || echo "Active Businesses: Data not available")

ALERTS AND INCIDENTS
--------------------
$(if [ -f "/var/log/sbc-health-check.log" ]; then
    echo "Recent alerts from monitoring:"
    tail -20 /var/log/sbc-health-check.log | grep -E "(CRITICAL|WARNING|ERROR)" | tail -5 | sed 's/^/  /'
else
    echo "  No alert log found"
fi)

NEXT STEPS
----------
1. Review performance trends and identify optimization opportunities
2. Monitor error rates and investigate any spikes
3. Check capacity planning needs based on traffic growth
4. Verify backup and disaster recovery procedures
5. Update monitoring thresholds if necessary

=====================================
Report generated at: $(date '+%Y-%m-%d %H:%M:%S')
Monitoring system: Small Business Chatbot Health Monitor
Contact: Ravi Kalla <ravi2523096+sbc@gmail.com>
=====================================
EOF

    echo -e "${GREEN}✅ Daily report generated: $REPORT_FILE${NC}"
}

send_report() {
    local subject="SBC Daily Performance Report - $(date '+%Y-%m-%d')"
    
    if command -v mail >/dev/null 2>&1; then
        mail -s "$subject" "$EMAIL" < "$REPORT_FILE"
        echo -e "${GREEN}✅ Report sent to $EMAIL${NC}"
    else
        echo -e "${BLUE}📧 Mail not configured. Report saved to: $REPORT_FILE${NC}"
        echo "You can manually send this report or configure mail service."
    fi
}

cleanup() {
    # Keep reports for 7 days
    find /tmp -name "sbc_daily_report_*.txt" -mtime +7 -delete 2>/dev/null || true
}

main() {
    echo -e "${BLUE}📊 Starting daily report generation...${NC}"
    
    # Check if the service is reachable
    if ! curl -s --max-time 5 "$BASE_URL/health" >/dev/null; then
        echo "❌ Service is not reachable. Cannot generate report."
        
        # Send alert about service being down
        if command -v mail >/dev/null 2>&1; then
            echo "SBC service is unreachable during daily report generation. Please investigate." | \
                mail -s "SBC Alert: Service Unreachable" "$EMAIL"
        fi
        return 1
    fi
    
    # Generate the report
    generate_report
    
    # Send the report
    send_report
    
    # Cleanup old reports
    cleanup
    
    echo -e "${GREEN}✅ Daily report process completed${NC}"
}

# Run main function
main