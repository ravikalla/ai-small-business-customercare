#!/bin/bash
# Continuous Performance Monitoring Script
# Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
#
# This script runs continuously and monitors key performance metrics,
# sending alerts when thresholds are exceeded.

BASE_URL="http://ec2-54-86-8-77.compute-1.amazonaws.com:3000"
ALERT_EMAIL="admin@yourcompany.com"  # Replace with your email
LOG_FILE="/var/log/sbc-performance-monitor.log"
PID_FILE="/var/run/sbc-performance-monitor.pid"

# Performance thresholds
MAX_RESPONSE_TIME=1000      # milliseconds
MAX_ERROR_RATE=5            # percentage
MAX_MEMORY_PERCENT=85       # percentage
MIN_REQUESTS_PER_SEC=0.1    # minimum activity threshold

# Alert cooldown (seconds) - prevent spam alerts
ALERT_COOLDOWN=300  # 5 minutes
LAST_ALERT_FILE="/tmp/sbc-last-alert"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local message="$2"
    local alert_type="$3"
    
    # Check cooldown period
    if [ -f "$LAST_ALERT_FILE" ]; then
        local last_alert=$(cat "$LAST_ALERT_FILE")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_alert))
        
        if [ $time_diff -lt $ALERT_COOLDOWN ]; then
            log_message "⏰ Alert cooldown active. Skipping: $subject"
            return
        fi
    fi
    
    # Send alert
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log_message "📧 Alert sent: $subject"
    else
        log_message "📧 Would send alert: $subject - $message"
    fi
    
    # Update last alert time
    date +%s > "$LAST_ALERT_FILE"
}

check_service_availability() {
    if ! curl -s --max-time 10 "$BASE_URL/health" >/dev/null; then
        send_alert "🚨 SBC CRITICAL: Service Down" \
            "The SBC application is not responding to health checks. Immediate investigation required." \
            "critical"
        return 1
    fi
    return 0
}

monitor_performance() {
    local metrics_response
    metrics_response=$(curl -s --max-time 10 "$BASE_URL/api/performance/metrics")
    
    if [ -z "$metrics_response" ] || [ "$metrics_response" = "null" ]; then
        log_message "${RED}❌ Unable to retrieve performance metrics${NC}"
        return 1
    fi
    
    # Extract metrics
    local avg_response_time
    local error_rate
    local heap_used
    local heap_total
    local requests_per_sec
    
    avg_response_time=$(echo "$metrics_response" | jq -r '.metrics.response_times.avg // 0')
    error_rate=$(echo "$metrics_response" | jq -r '.metrics.errorRate // 0' | sed 's/%//')
    heap_used=$(echo "$metrics_response" | jq -r '.metrics.memory.heapUsed // "0MB"' | sed 's/MB//')
    heap_total=$(echo "$metrics_response" | jq -r '.metrics.memory.heapTotal // "0MB"' | sed 's/MB//')
    requests_per_sec=$(echo "$metrics_response" | jq -r '.metrics.requestsPerSecond // 0')
    
    # Calculate memory percentage
    local memory_percent=0
    if [ "$heap_total" != "0" ] && [ -n "$heap_used" ] && [ -n "$heap_total" ]; then
        memory_percent=$(echo "scale=2; ($heap_used / $heap_total) * 100" | bc -l 2>/dev/null || echo "0")
    fi
    
    # Log current metrics
    log_message "${BLUE}📊 Current Metrics:${NC} Response: ${avg_response_time}ms, Error: ${error_rate}%, Memory: ${memory_percent}%, RPS: ${requests_per_sec}"
    
    # Check response time threshold
    if [ -n "$avg_response_time" ] && (( $(echo "$avg_response_time > $MAX_RESPONSE_TIME" | bc -l 2>/dev/null || echo 0) )); then
        send_alert "⚠️ SBC WARNING: High Response Time" \
            "Average response time is ${avg_response_time}ms (threshold: ${MAX_RESPONSE_TIME}ms). Application may be under stress." \
            "warning"
    fi
    
    # Check error rate threshold
    if [ -n "$error_rate" ] && (( $(echo "$error_rate > $MAX_ERROR_RATE" | bc -l 2>/dev/null || echo 0) )); then
        send_alert "🚨 SBC CRITICAL: High Error Rate" \
            "Error rate is ${error_rate}% (threshold: ${MAX_ERROR_RATE}%). Multiple requests are failing." \
            "critical"
    fi
    
    # Check memory usage threshold
    if [ -n "$memory_percent" ] && (( $(echo "$memory_percent > $MAX_MEMORY_PERCENT" | bc -l 2>/dev/null || echo 0) )); then
        send_alert "⚠️ SBC WARNING: High Memory Usage" \
            "Memory usage is ${memory_percent}% (threshold: ${MAX_MEMORY_PERCENT}%). Risk of memory exhaustion." \
            "warning"
    fi
    
    # Check for very low activity (might indicate issues)
    if [ -n "$requests_per_sec" ] && (( $(echo "$requests_per_sec < $MIN_REQUESTS_PER_SEC" | bc -l 2>/dev/null || echo 0) )); then
        send_alert "⚠️ SBC WARNING: Low Activity" \
            "Request rate is very low (${requests_per_sec} req/sec). Service might not be receiving traffic." \
            "warning"
    fi
}

check_performance_health() {
    local health_response
    health_response=$(curl -s --max-time 10 "$BASE_URL/api/performance/health")
    
    if [ -n "$health_response" ] && [ "$health_response" != "null" ]; then
        local health_status
        health_status=$(echo "$health_response" | jq -r '.health.status // "unknown"')
        
        case "$health_status" in
            "critical")
                local issues
                issues=$(echo "$health_response" | jq -r '.health.issues | join(", ")' 2>/dev/null || echo "Unknown issues")
                send_alert "🚨 SBC CRITICAL: Performance Health Critical" \
                    "Performance health is CRITICAL. Issues detected: $issues" \
                    "critical"
                ;;
            "warning")
                local issues
                issues=$(echo "$health_response" | jq -r '.health.issues | join(", ")' 2>/dev/null || echo "Unknown issues")
                send_alert "⚠️ SBC WARNING: Performance Health Warning" \
                    "Performance health is WARNING. Issues detected: $issues" \
                    "warning"
                ;;
            "healthy")
                log_message "${GREEN}✅ Performance health is healthy${NC}"
                ;;
            *)
                log_message "${YELLOW}⚠️ Unknown performance health status: $health_status${NC}"
                ;;
        esac
    fi
}

cleanup() {
    log_message "🛑 Performance monitor stopping..."
    rm -f "$PID_FILE"
    exit 0
}

start_monitoring() {
    # Check if already running
    if [ -f "$PID_FILE" ]; then
        local old_pid
        old_pid=$(cat "$PID_FILE")
        if ps -p "$old_pid" >/dev/null 2>&1; then
            echo "Performance monitor is already running (PID: $old_pid)"
            exit 1
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    # Write PID file
    echo $$ > "$PID_FILE"
    
    # Set up signal handlers
    trap cleanup SIGINT SIGTERM EXIT
    
    log_message "${GREEN}🚀 Starting performance monitoring...${NC}"
    log_message "Target URL: $BASE_URL"
    log_message "Alert email: $ALERT_EMAIL"
    log_message "Thresholds: Response time: ${MAX_RESPONSE_TIME}ms, Error rate: ${MAX_ERROR_RATE}%, Memory: ${MAX_MEMORY_PERCENT}%"
    
    # Initial service check
    if ! check_service_availability; then
        log_message "${RED}❌ Initial service check failed${NC}"
        return 1
    fi
    
    # Monitoring loop
    local check_count=0
    while true; do
        check_count=$((check_count + 1))
        
        log_message "${BLUE}🔍 Monitoring check #$check_count${NC}"
        
        # Check service availability
        if check_service_availability; then
            # Monitor performance metrics
            monitor_performance
            
            # Check performance health (every 5th check to reduce load)
            if [ $((check_count % 5)) -eq 0 ]; then
                check_performance_health
            fi
        else
            log_message "${RED}❌ Service is not available${NC}"
        fi
        
        # Sleep for the monitoring interval
        sleep 60  # Check every minute
    done
}

show_status() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" >/dev/null 2>&1; then
            echo "Performance monitor is running (PID: $pid)"
            
            # Show recent log entries
            if [ -f "$LOG_FILE" ]; then
                echo ""
                echo "Recent monitoring activity:"
                tail -5 "$LOG_FILE"
            fi
        else
            echo "Performance monitor is not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        echo "Performance monitor is not running"
    fi
}

stop_monitoring() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" >/dev/null 2>&1; then
            echo "Stopping performance monitor (PID: $pid)..."
            kill "$pid"
            
            # Wait for process to stop
            local count=0
            while ps -p "$pid" >/dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            if ps -p "$pid" >/dev/null 2>&1; then
                echo "Force killing performance monitor..."
                kill -9 "$pid"
            fi
            
            rm -f "$PID_FILE"
            echo "Performance monitor stopped"
        else
            echo "Performance monitor is not running"
            rm -f "$PID_FILE"
        fi
    else
        echo "Performance monitor is not running"
    fi
}

show_help() {
    cat << EOF
SBC Performance Monitor

Usage: $0 [COMMAND]

Commands:
    start     Start the performance monitoring daemon
    stop      Stop the performance monitoring daemon
    status    Show current status of the monitor
    restart   Restart the monitoring daemon
    help      Show this help message

The monitor checks performance metrics every minute and sends alerts
when thresholds are exceeded.

Configuration:
- Target URL: $BASE_URL
- Alert email: $ALERT_EMAIL
- Log file: $LOG_FILE
- PID file: $PID_FILE

Thresholds:
- Max response time: ${MAX_RESPONSE_TIME}ms
- Max error rate: ${MAX_ERROR_RATE}%
- Max memory usage: ${MAX_MEMORY_PERCENT}%

Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
EOF
}

# Main command handling
case "${1:-start}" in
    "start")
        start_monitoring
        ;;
    "stop")
        stop_monitoring
        ;;
    "status")
        show_status
        ;;
    "restart")
        stop_monitoring
        sleep 2
        start_monitoring
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac