# System Architecture Overview

**Author:** Ravi Kalla <ravi2523096+sbc@gmail.com>  
**Project:** Small Business Chatbot (SBC) System  
**Last Updated:** 2025-06-22

## Table of Contents
- [High-Level System Architecture](#high-level-system-architecture)
- [Message Flow Architecture](#message-flow-architecture)
- [Multi-Tenant Data Architecture](#multi-tenant-data-architecture)
- [Service Layer Architecture](#service-layer-architecture)
- [Infrastructure & Deployment](#infrastructure--deployment)
- [Security & Data Flow](#security--data-flow)
- [Monitoring & Analytics](#monitoring--analytics)

---

## High-Level System Architecture

The SBC system is a multi-tenant WhatsApp AI assistant platform that enables small businesses to provide 24/7 customer support through intelligent chatbots.

```mermaid
graph TB
    subgraph "Users"
        BU[Business Owner<br/>+15852819787]
        CU[Customer<br/>+1234567890]
    end
    
    subgraph "Communication Layer"
        WA[WhatsApp]
        TW[Twilio WhatsApp<br/>Business API]
    end
    
    subgraph "Application Layer"
        WH[Webhook Handler<br/>/api/webhook/whatsapp]
        RT[Express Routes]
        MW[Middleware<br/>Rate Limiting, Validation]
    end
    
    subgraph "Business Logic Layer"
        BS[Business Service]
        KS[Knowledge Service] 
        AS[AI Service]
        TWS[Twilio Service]
    end
    
    subgraph "Data Layer"
        SB[(Supabase<br/>PostgreSQL)]
        PC[(Pinecone<br/>Vector DB)]
        CH[Cache Layer<br/>Multi-level]
    end
    
    subgraph "External APIs"
        OAI[OpenAI<br/>GPT-4]
        TWA[Twilio API]
    end
    
    subgraph "Infrastructure"
        EC2[Fargate]
        CW[CloudWatch<br/>Logging]
        PS[Parameter Store<br/>Secrets]
    end
    
    BU -->|!add, !list, !help| WA
    CU -->|!business ID question| WA
    WA --> TW
    TW -->|Webhook POST| WH
    WH --> MW
    MW --> RT
    RT --> BS
    RT --> KS
    RT --> AS
    
    BS --> SB
    KS --> SB
    KS --> PC
    AS --> OAI
    AS --> CH
    TWS --> TWA
    
    BS --> KS
    AS --> KS
    RT --> TWS
    
    EC2 -.->|Hosts| RT
    RT -.->|Logs to| CW
    RT -.->|Gets secrets| PS
    
    style BU fill:#e1f5fe
    style CU fill:#f3e5f5
    style AS fill:#fff3e0
    style PC fill:#e8f5e8
    style OAI fill:#ffebee
```

### Key Components:

- **Users**: Business owners manage knowledge base, customers query businesses
- **Communication Layer**: WhatsApp integration via Twilio Business API
- **Application Layer**: Express.js server with webhook handling and middleware
- **Business Logic**: Modular services for business management, knowledge processing, and AI
- **Data Layer**: PostgreSQL for structured data, Pinecone for vector search, caching for performance
- **External APIs**: OpenAI for AI responses, Twilio for messaging
- **Infrastructure**: AWS hosting with monitoring and secrets management

---

## Message Flow Architecture

This sequence diagram shows how messages flow through the system from business setup to customer queries.

```mermaid
sequenceDiagram
    participant BO as Business Owner
    participant C as Customer
    participant WA as WhatsApp
    participant TW as Twilio
    participant WH as Webhook
    participant BS as Business Service
    participant KS as Knowledge Service
    participant VS as Vector Service
    participant AI as AI Service
    participant DB as Database
    participant PC as Pinecone

    Note over BO, PC: Business Owner Setup Flow
    BO->>WA: !register Ravi Indian Restaurant
    WA->>TW: Message
    TW->>WH: POST /api/webhook/whatsapp
    WH->>BS: registerBusiness()
    BS->>DB: Store business data
    BS-->>BO: ✅ Business registered: raviindi_6615

    BO->>WA: !add We serve biryanis and curries
    WA->>TW: Message
    TW->>WH: POST /api/webhook/whatsapp
    WH->>KS: addTextKnowledge()
    KS->>VS: createEmbedding()
    VS->>PC: Store vector
    KS->>DB: Store metadata
    KS-->>BO: ✅ Knowledge added

    Note over C, PC: Customer Query Flow
    C->>WA: !business raviindi_6615 What do you serve?
    WA->>TW: Message
    TW->>WH: POST /api/webhook/whatsapp
    WH->>KS: Query routing
    KS->>VS: semanticSearch()
    VS->>PC: Vector similarity search
    PC-->>VS: Relevant documents
    VS-->>KS: Context data
    KS->>AI: generateResponse()
    AI-->>KS: AI response
    KS-->>WH: Final response
    WH->>TW: Send message
    TW->>WA: Deliver to customer
    WA-->>C: "We serve authentic biryanis and curries..."
```

### Flow Explanation:

1. **Business Registration**: Owner registers business via WhatsApp, system creates business record
2. **Knowledge Addition**: Owner adds content, system creates embeddings and stores in vector database
3. **Customer Query**: Customer asks question, system searches knowledge base and generates AI response
4. **Response Delivery**: AI response delivered back through WhatsApp to customer

---

## Multi-Tenant Data Architecture

The system supports multiple businesses with complete data isolation and efficient query performance.

```mermaid
erDiagram
    BUSINESSES {
        string business_id PK "raviindi_6615"
        string business_name "Ravi Indian Restaurant"
        string owner_phone "+15852819787"
        timestamp registered_at
        int knowledge_count "5"
        string status "active"
        jsonb metadata "{}"
    }
    
    KNOWLEDGE_ENTRIES {
        string knowledge_id PK "kb_raviindi_6615_1640995200_abc123"
        string business_id FK "raviindi_6615"
        string business_name "Ravi Indian Restaurant"
        string type "text|document|image"
        string filename "menu.pdf"
        text content_preview "We serve authentic..."
        jsonb metadata "{size: 1024, vectors: 5}"
    }
    
    PINECONE_VECTORS {
        string id "kb_raviindi_6615_1640995200_abc123_chunk_0"
        float[] values "[0.1, 0.2, ...]"
        jsonb metadata "{business_id: 'raviindi_6615', chunk: 0}"
    }
    
    QUERY_LOGS {
        string id PK
        string business_id FK "raviindi_6615"
        string customer_phone "+1234567890"
        text query "What do you serve?"
        text response "We serve authentic..."
        timestamp created_at
        float response_time "0.85"
    }
    
    BUSINESSES ||--o{ KNOWLEDGE_ENTRIES : "has many"
    KNOWLEDGE_ENTRIES ||--o{ PINECONE_VECTORS : "generates"
    BUSINESSES ||--o{ QUERY_LOGS : "receives"
```

### Data Model Features:

- **Business Isolation**: Each business has unique ID with scoped data access
- **Knowledge Management**: Text and document content with vector representations
- **Analytics Tracking**: Query logs for business intelligence and performance monitoring
- **Flexible Metadata**: JSONB fields for extensible data without schema changes

---

## Service Layer Architecture

The modular service architecture enables maintainable, testable, and scalable code organization.

```mermaid
graph LR
    subgraph "Controllers"
        WC[Webhook Controller]
        BC[Business Controller]
        KC[Knowledge Controller]
    end
    
    subgraph "Services"
        BS[Business Service<br/>Multi-tenant Logic]
        KS[Knowledge Service<br/>Content Processing]
        AS[AI Service<br/>Response Generation]
        VS[Vector Service<br/>Similarity Search]
        TS[Twilio Service<br/>Message Delivery]
    end
    
    subgraph "Models"
        BM[Business Model<br/>CRUD Operations]
        KM[Knowledge Model<br/>Content Storage]
    end
    
    subgraph "External APIs"
        OAI[OpenAI API<br/>GPT-4]
        TWA[Twilio API<br/>WhatsApp Messaging]
        PCA[Pinecone API<br/>Vector Operations]
        SBA[Supabase API<br/>PostgreSQL]
    end
    
    subgraph "Utils"
        CA[Cache<br/>Multi-level]
        RL[Rate Limiter<br/>Per-user/Global]
        VA[Validator<br/>Input Sanitization]
        LO[Logger<br/>CloudWatch]
        RT[Retry<br/>Circuit Breaker]
    end
    
    WC --> BS
    WC --> KS
    WC --> AS
    BC --> BS
    KC --> KS
    
    BS --> BM
    KS --> KM
    KS --> VS
    AS --> VS
    
    BM --> SBA
    KM --> SBA
    VS --> PCA
    AS --> OAI
    TS --> TWA
    
    AS --> CA
    VS --> CA
    WC --> RL
    WC --> VA
    WC --> LO
    AS --> RT
    VS --> RT
```

### Service Responsibilities:

- **Controllers**: Handle HTTP requests, route to appropriate services
- **Services**: Implement business logic, coordinate between models and external APIs
- **Models**: Data access layer with database operations
- **Utils**: Cross-cutting concerns like caching, logging, validation

---

## Infrastructure & Deployment

Production deployment on AWS with automated CI/CD and comprehensive monitoring.

```mermaid
graph TB
    subgraph "Development"
        DEV[Local Development<br/>npm start]
        NG[ngrok Tunnel<br/>Webhook Testing]
    end
    
    subgraph "AWS Production"
        subgraph "Compute"
            EC2[EC2 Instance<br/>t3.micro]
            PM2[PM2 Process Manager<br/>Auto-restart]
        end
        
        subgraph "Monitoring"
            CW[CloudWatch Logs<br/>Application & System]
            CWA[CloudWatch Agent<br/>Custom Metrics]
        end
        
        subgraph "Security & Config"
            IAM[IAM Role<br/>sbc-system-role]
            PS[Parameter Store<br/>API Keys & Secrets]
            SG[Security Group<br/>Ports 22, 80, 443, 3000]
        end
        
        subgraph "Networking"
            VPC[Default VPC]
            EIP[Elastic IP<br/>Static Public IP]
        end
    end
    
    subgraph "External Services"
        subgraph "Databases"
            SB[Supabase<br/>PostgreSQL]
            PC[Pinecone<br/>Vector Database]
        end
        
        subgraph "APIs"
            TW[Twilio<br/>WhatsApp API]
            OAI[OpenAI<br/>GPT API]
        end
    end
    
    subgraph "CI/CD"
        GH[GitHub Repository]
        GA[GitHub Actions<br/>Auto Deploy]
    end
    
    DEV -->|Deploy| EC2
    NG -->|Test Webhooks| EC2
    
    EC2 --> PM2
    PM2 --> CW
    PM2 --> CWA
    
    EC2 --> PS
    EC2 --> SB
    EC2 --> PC
    EC2 --> TW
    EC2 --> OAI
    
    IAM --> PS
    IAM --> CW
    SG --> EC2
    VPC --> EC2
    EIP --> EC2
    
    GH --> GA
    GA --> EC2
    
    style EC2 fill:#ff9800
    style SB fill:#4caf50
    style PC fill:#2196f3
    style TW fill:#9c27b0
    style OAI fill:#f44336
```

### Deployment Features:

- **Local Development**: Hot reload with ngrok for webhook testing
- **Production**: AWS Fargate with PM2 process management
- **Monitoring**: CloudWatch for logs and metrics
- **Security**: IAM roles, Parameter Store for secrets
- **CI/CD**: GitHub Actions for automated deployment

---

## Security & Data Flow

Multi-layered security approach protecting data, APIs, and user interactions.

```mermaid
graph TB
    subgraph "Input Validation Layer"
        IV[Input Validator<br/>Sanitization]
        RL[Rate Limiter<br/>DDoS Protection]
        WV[Webhook Signature<br/>Verification]
    end
    
    subgraph "Authentication & Authorization"
        PH[Phone Number<br/>Identification]
        BV[Business Verification<br/>Owner Validation]
        RLS[Row Level Security<br/>Multi-tenant Isolation]
    end
    
    subgraph "Data Security"
        ENC[Encryption at Rest<br/>Supabase + Pinecone]
        SEC[Secrets Management<br/>AWS Parameter Store]
        LOG[Audit Logging<br/>CloudWatch]
    end
    
    subgraph "Network Security"
        HTTPS[HTTPS/TLS<br/>All Communications]
        VPC[Private VPC<br/>Internal Services]
        SG[Security Groups<br/>Firewall Rules]
    end
    
    subgraph "Business Logic Security"
        CT[Content Filtering<br/>Suspicious Detection]
        QT[Query Throttling<br/>Per-business Limits]
        DV[Data Validation<br/>Schema Enforcement]
    end
    
    IV --> PH
    RL --> BV
    WV --> RLS
    
    PH --> CT
    BV --> QT
    RLS --> DV
    
    CT --> ENC
    QT --> SEC
    DV --> LOG
    
    ENC --> HTTPS
    SEC --> VPC
    LOG --> SG
    
    style IV fill:#ffeb3b
    style WV fill:#ff5722
    style RLS fill:#3f51b5
    style ENC fill:#4caf50
    style LOG fill:#795548
```

### Security Layers:

- **Input Validation**: Sanitization and rate limiting at entry points
- **Authentication**: Phone-based identification with business verification
- **Data Security**: Encryption, secrets management, and audit logging
- **Network Security**: HTTPS, VPC isolation, and firewall rules
- **Business Logic**: Content filtering and query throttling

---

## Monitoring & Analytics

Comprehensive observability across application, business, and infrastructure metrics.

```mermaid
graph LR
    subgraph "Application Metrics"
        AM[API Response Times]
        EM[Error Rates]
        TM[Throughput Metrics]
        UM[User Activity]
    end
    
    subgraph "Business Metrics"
        BM[Business Registration Rate]
        KM[Knowledge Base Growth]
        QM[Query Volume Per Business]
        SM[Success/Failure Rates]
    end
    
    subgraph "Infrastructure Metrics"
        CM[CPU/Memory Usage]
        DM[Database Performance]
        NM[Network I/O]
        PM[Process Health PM2]
    end
    
    subgraph "External Service Metrics"
        TW[Twilio API Usage]
        OA[OpenAI API Costs]
        PC[Pinecone Operations]
        SB[Supabase Queries]
    end
    
    subgraph "Monitoring Stack"
        CW[CloudWatch<br/>Centralized Logging]
        CWD[CloudWatch Dashboard<br/>Real-time Metrics]
        AL[CloudWatch Alarms<br/>Threshold Monitoring]
    end
    
    subgraph "Analytics & Reporting"
        API[API Analytics<br/>/api/metrics endpoint]
        LOG[Log Analysis<br/>/api/logs endpoint]
        WEB[Web Dashboard<br/>/logs HTML viewer]
    end
    
    AM --> CW
    EM --> CW
    TM --> CW
    UM --> CW
    
    BM --> CW
    KM --> CW
    QM --> CW
    SM --> CW
    
    CM --> CW
    DM --> CW
    NM --> CW
    PM --> CW
    
    TW --> CW
    OA --> CW
    PC --> CW
    SB --> CW
    
    CW --> CWD
    CW --> AL
    CW --> API
    CW --> LOG
    CW --> WEB
```

### Monitoring Capabilities:

- **Application Metrics**: Performance, errors, and user activity tracking
- **Business Metrics**: Registration rates, knowledge growth, query patterns
- **Infrastructure Metrics**: System health, database performance, network activity
- **External Service Metrics**: API usage, costs, and performance of third-party services
- **Centralized Monitoring**: CloudWatch integration with dashboards and alerting

---

## Architecture Benefits

### Scalability
- **Multi-tenant**: Supports unlimited businesses with data isolation
- **Microservices**: Modular architecture enables independent scaling
- **Caching**: Multi-level caching reduces database load and API costs
- **Vector Search**: Efficient semantic search scales to millions of documents

### Reliability
- **Circuit Breakers**: Graceful degradation when external services fail
- **Health Monitoring**: Comprehensive health checks and alerting
- **Auto-restart**: PM2 process management with automatic recovery
- **Backup Systems**: Automated data backup and restore capabilities

### Security
- **Multi-layered**: Defense in depth with validation, authentication, and encryption
- **Zero Trust**: All communications encrypted and verified
- **Audit Trail**: Comprehensive logging for compliance and debugging
- **Secrets Management**: Centralized secret storage with AWS Parameter Store

### Maintainability
- **Clean Architecture**: Clear separation of concerns with modular design
- **Documentation**: Comprehensive documentation with visual diagrams
- **Testing**: Modular structure enables unit and integration testing
- **Monitoring**: Observable systems with detailed metrics and logging

This architecture supports a production-ready, enterprise-grade WhatsApp AI platform capable of serving thousands of businesses with high reliability, security, and performance.
