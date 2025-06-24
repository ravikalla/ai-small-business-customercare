# Small Business Chatbot Documentation

This directory contains comprehensive documentation for the Small Business Chatbot application.

## Documentation Index

### 📊 [Monitoring Guide](./MONITORING.md)
Complete guide for monitoring the application in production, including:
- Real-time monitoring endpoints
- Performance metrics and health checks
- Automated monitoring setup
- AWS CloudWatch integration
- Alert configuration
- Load testing and troubleshooting

### 📁 [Scripts Documentation](../scripts/README.md)
Detailed documentation for monitoring scripts:
- Health check automation
- Daily performance reports
- Continuous performance monitoring
- Setup and configuration guides

## Quick Links

### Essential Monitoring URLs
- **Application Health:** `http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/health`
- **Performance Metrics:** `http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/metrics`
- **API Documentation:** `http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api-docs`
- **Log Viewer:** `http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/logs`

### Key Scripts
- **Health Check:** `./scripts/health-check.sh`
- **Daily Report:** `./scripts/daily-report.sh`
- **Performance Monitor:** `./scripts/performance-monitor.sh`

## Application Overview

The Small Business Chatbot is a WhatsApp AI Assistant that helps small businesses manage customer interactions through AI-powered responses. The application includes:

### Core Features
- WhatsApp integration via Twilio
- AI-powered responses using OpenAI
- Business knowledge base management
- Vector search capabilities
- Customer query handling

### Quality Assurance Features
- Comprehensive error handling
- Performance monitoring and metrics
- Structured logging system
- Load testing capabilities
- API documentation (Swagger)
- Unit and integration testing

### Monitoring Capabilities
- Real-time performance metrics
- Health check endpoints
- Automated alerting system
- Daily performance reports
- Load testing suite

## Getting Started with Monitoring

### 1. Quick Health Check
```bash
curl http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/health
```

### 2. View Performance Metrics
```bash
curl http://ec2-54-86-8-77.compute-1.amazonaws.com:3000/api/performance/metrics
```

### 3. Set Up Automated Monitoring
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run health check
./scripts/health-check.sh

# Start continuous monitoring
./scripts/performance-monitor.sh start
```

## Support and Maintenance

### Contact Information
- **Developer:** Ravi Kalla
- **Email:** ravi2523096+sbc@gmail.com
- **Repository:** https://github.com/ravikalla/ai-small-business-customercare

### Emergency Procedures
1. Check application health endpoint
2. Review performance metrics
3. Examine application logs
4. Follow troubleshooting guide in monitoring documentation

### Regular Maintenance
- Daily: Review performance metrics
- Weekly: Analyze performance trends
- Monthly: Update monitoring thresholds
- Quarterly: Conduct load testing

---

**Last Updated:** 2025-06-24  
**Version:** 1.2.0  
**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>