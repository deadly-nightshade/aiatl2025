# MedGuard AI

A comprehensive medical AI analysis system that provides real-time hallucination detection, citation verification, and HIPAA compliance checking for medical AI outputs. This system acts as middleware between your chatbot and end users, ensuring every AI response meets clinical standards before delivery.

## 🎯 Overview

MedGuard AI is a full-stack application that monitors, analyzes, and verifies medical AI chatbot responses. It consists of:

- **Backend**: FastAPI-based agentic system using Google Gemini AI for analysis
- **Frontend**: Modern React dashboard with real-time monitoring and compliance reporting
- **Agents**: Specialized AI agents for hallucination detection, citation checking, and compliance validation

### Key Features

- 🔍 **Hallucination Detection**: Automatically detects potential hallucinations in LLM outputs using real-time web verification
- 📚 **Citation Verification**: Validates citations against PubMed, DOI, and web sources
- 🛡️ **HIPAA Compliance**: Ensures medical content meets HIPAA and FDA compliance standards
- 📊 **Real-time Monitoring**: Live dashboard showing verification status and detailed compliance reports
- 🔄 **Background Processing**: Non-blocking analysis that doesn't disrupt chatbot flow
- 📝 **Audit Trail**: Complete history of all prompts, responses, and verification results

## 🏗️ Architecture

```
┌─────────────────┐
│   Chatbot       │
│   (External)    │
└────────┬────────┘
         │
         │ POST /api/bot-output
         ▼
┌─────────────────┐
│  FastAPI Backend│
│  - Agents       │
│  - Analysis     │
│  - Reports      │
└────────┬────────┘
         │
         │ REST API
         ▼
┌─────────────────┐
│  React Frontend │
│  - Dashboard    │
│  - Reports      │
│  - History      │
└─────────────────┘
```

## 🚀 Setup

### Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/))
- **Google Search API Key** ([Get one here](https://console.cloud.google.com/))

### Environment Variables

**Backend (.env)**:
```env
GOOGLE_API_KEY=your_gemini_api_key
GOOGLE_SEARCH_API_KEY=your_search_api_key
GOOGLE_GEMINI_MODEL=gemini-pro
FLASK_ENV=production
FLASK_DEBUG=False
```

**Frontend (.env)**:
```env
VITE_CHATBOT_BASE_URL=https://your-chatbot-url.com
VITE_API_BASE_URL=https://your-backend-url.com
```

### Installation

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
npm run build
```

## 📖 Usage

### API Endpoints

#### Main Analysis Endpoint
```bash
POST /api/report
Content-Type: application/json

{
  "original_prompt": "What are the side effects of aspirin?",
  "llm_output": "Aspirin can cause stomach bleeding..."
}
```

#### Bot Output Ingestion
```bash
POST /api/bot-output
Content-Type: application/json

{
  "prompt": "User's question",
  "response": "AI's response",
  "metadata": { "conversationId": "optional-id" }
}
```

#### Other Endpoints
- `GET /api/bot-output` - List all captured bot outputs
- `GET /api/report/{response_id}` - Get analysis report for a specific response
- `GET /api/agents` - List available agents
- `GET /docs` - Interactive API documentation (Swagger UI)



## 🤖 Agent System

### HallucinationGuard Agent
Detects potential hallucinations in LLM outputs through:
- Citation extraction and verification
- Real-time web search verification
- Source consistency checking
- Risk level assessment (LOW, MEDIUM, HIGH, CRITICAL)

### Citation Checker Agent
Verifies citations against:
- PubMed API (PMID validation)
- DOI resolution
- General web search
- Citation-claim support analysis

### Compliance Checker Agent
Ensures HIPAA and medical compliance by checking:
- PHI (Protected Health Information) detection
- Required medical disclaimers
- Emergency situation handling
- Medical advice appropriateness
- FDA compliance

## 📊 Response Structure

```json
{
  "report_id": "report_1234",
  "analysis": {
    "hallucination_analysis": {
      "citations_found": 1,
      "risk_level": "MEDIUM"
    },
    "compliance_analysis": {
      "compliance_score": 85,
      "overall_status": "MOSTLY_COMPLIANT"
    },
    "combined_assessment": {
      "overall_risk_level": "MEDIUM",
      "recommendation": "Review and address identified issues before use"
    }
  },
  "status": "completed",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Risk Levels
- **LOW**: Content appears safe for use
- **MEDIUM**: Minor issues detected, review recommended
- **HIGH**: Significant issues, major revision needed
- **CRITICAL**: Serious violations, content unsafe for use

## 🗂️ Project Structure

```
aiatl2025/
├── backend/
│   ├── app.py                 # Main FastAPI application
│   ├── config.py               # Configuration settings
│   ├── requirements.txt      # Python dependencies
│   └── agents/
│       ├── base_agent.py
│       ├── gemini_agent.py
│       ├── hallucination_guard.py
│       ├── citation_checker.py
│       └── compliance_checker.py
│
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── pages/Index.tsx
    │   ├── components/
    │   ├── services/
    │   └── hooks/
    └── package.json
```

## 📝 API Usage Limits

- **Gemini API**: Free tier includes 15 requests per minute
- **Search API**: 100 free queries per day, then $5 per 1000 queries


---

**Built with ❤️ for medical AI safety and compliance**
