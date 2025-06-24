#!/bin/bash
# Health Check Script for SBC Application
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

BASE_URL="http://ec2-54-86-8-77.compute-1.amazonaws.com:3000"
LOG_FILE="/var/log/sbc-health-check.log"
EMAIL_ALERT="admin@yourcompany.com"  # Replace with your email

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo -e "$1"
}

check_health() {
    local health_status
    health_status=$(curl -s --max-time 10 "$BASE_URL/health" | jq -r '.status // "error"')
    
    if [ "$health_status" = "healthy" ]; then
        log_message "${GREEN}✅ Application Health: HEALTHY${NC}"
        return 0
    else
        log_message "${RED}🚨 Application Health: $health_status${NC}"
        return 1
    fi
}

check_performance() {
    local perf_status
    perf_status=$(curl -s --max-time 10 "$BASE_URL/api/performance/health" | jq -r '.health.status // "error"')
    
    case "$perf_status" in
        "healthy")
            log_message "${GREEN}✅ Performance: HEALTHY${NC}"
            return 0
            ;;
        "warning")
            log_message "${YELLOW}⚠️ Performance: WARNING${NC}"
            return 1
            ;;
        "critical")
            log_message "${RED}🚨 Performance: CRITICAL${NC}"
            return 2
            ;;
        *)
            log_message "${RED}❌ Performance: ERROR${NC}"
            return 3
            ;;
    esac
}

get_key_metrics() {
    local metrics
    metrics=$(curl -s --max-time 10 "$BASE_URL/api/performance/metrics" | jq '{
        total_requests: .metrics.requests.total,
        avg_response_time: .metrics.response_times.avg,
        error_rate: .metrics.errorRate,
        memory_used: .metrics.memory.heapUsed,
        requests_per_second: .metrics.requestsPerSecond
    }')
    
    if [ "$metrics" != "null" ] && [ -n "$metrics" ]; then
        log_message "${BLUE}📊 Key Metrics:${NC}"
        echo "$metrics" | jq -r 'to_entries[] | "  \(.key): \(.value)"' | while read -r line; do
            log_message "    $line"
        done
    else
        log_message "${RED}❌ Unable to retrieve metrics${NC}"
    fi
}

send_alert() {
    local subject="$1"
    local message="$2"
    
    # Check if mail command is available
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "$subject" "$EMAIL_ALERT"
        log_message "📧 Alert sent: $subject"
    else
        log_message "${YELLOW}⚠️ Mail not configured. Alert would be: $subject${NC}"
    fi
}

check_external_dependencies() {
    log_message "${BLUE}🔍 Checking external dependencies...${NC}"
    
    # Check if we can reach the main API
    if curl -s --max-time 5 "$BASE_URL" >/dev/null; then
        log_message "${GREEN}✅ Main API endpoint reachable${NC}"
    else
        log_message "${RED}❌ Main API endpoint unreachable${NC}"
        return 1
    fi
    
    # Check specific endpoints
    local endpoints=("health" "api/performance/metrics" "api/businesses")
    for endpoint in "${endpoints[@]}"; do
        if curl -s --max-time 5 "$BASE_URL/$endpoint" >/dev/null; then
            log_message "${GREEN}✅ /$endpoint endpoint reachable${NC}"
        else
            log_message "${RED}❌ /$endpoint endpoint unreachable${NC}"
        fi
    done
}

main() {
    log_message "${BLUE}🔍 Starting health check...${NC}"
    
    local health_check=0
    local perf_check=0
    
    # Check external dependencies first
    if ! check_external_dependencies; then
        send_alert "SBC Alert: Service Unreachable" "SBC application appears to be down. Cannot reach main endpoints."
        log_message "${RED}🚨 Service appears to be down${NC}"
        return 1
    fi
    
    # Check application health
    if ! check_health; then
        health_check=1
        send_alert "SBC Alert: Application Health Issue" "Application health check failed. Please investigate immediately."
    fi
    
    # Check performance
    check_performance
    perf_status=$?
    
    case $perf_status in
        2)
            send_alert "SBC Alert: Critical Performance Issue" "Performance is critical. Immediate action required."
            ;;
        1)
            send_alert "SBC Alert: Performance Warning" "Performance warning detected. Please review metrics."
            ;;
    esac
    
    # Get current metrics
    get_key_metrics
    
    # Overall status
    if [ $health_check -eq 0 ] && [ $perf_status -eq 0 ]; then
        log_message "${GREEN}✅ Overall Status: ALL SYSTEMS HEALTHY${NC}"
    else
        log_message "${RED}🚨 Overall Status: ISSUES DETECTED${NC}"
    fi
    
    log_message "${BLUE}✅ Health check completed${NC}"
    echo
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

# Run main function
main