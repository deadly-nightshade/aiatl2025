# FastAPI Medical AI Analysis System

This is a FastAPI application that implements a comprehensive agentic system using Google Gemini AI for medical content analysis, hallucination detection, and compliance checking.

## Features

- **HallucinationGuard Agent**: Detects potential hallucinations in LLM outputs
- **Citation Checker Agent**: Verifies citations against PubMed, DOI, and web sources  
- **Compliance Checker Agent**: Ensures HIPAA and medical compliance
- **Integrated Analysis**: Comprehensive reporting with risk assessment
- **Interactive API Documentation**: Swagger UI and ReDoc automatically generated

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Duplicate the .env.template file and add your API keys:
   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
   GOOGLE_GEMINI_MODEL=gemini-pro
   FLASK_ENV=development
   FLASK_DEBUG=True
   ```

3. Run the application:
   ```bash
   python app.py
   ```
   
   Or with uvicorn directly:
   ```bash
   uvicorn app:app --reload --host 0.0.0.0 --port 5000
   ```

4. **Start testing**: Open your browser and go to [http://localhost:5000/docs](http://localhost:5000/docs) for interactive API documentation

## API Documentation

- **Interactive Swagger UI**: [http://localhost:5000/docs](http://localhost:5000/docs)
- **ReDoc Documentation**: [http://localhost:5000/redoc](http://localhost:5000/redoc)
- **Health Check**: [http://localhost:5000/](http://localhost:5000/)

## API Endpoints

### Main Analysis Endpoint
- `POST /api/report` - **Primary endpoint for content analysis**

### Other Endpoints
- `GET /` - Health check
- `POST /api/chat` - Chat with individual agents
- `POST /api/agent/task` - Execute specific agent tasks
- `GET /api/agents` - List available agents
- `GET /api/history/{agent_name}` - Get conversation history
- `DELETE /api/history/{agent_name}` - Clear conversation history

## Quick Start Testing

1. **Go to [http://localhost:5000/docs](http://localhost:5000/docs)**
2. **Click on `POST /api/report`**
3. **Click "Try it out"**
4. **Use this sample request**:
   ```json
   {
     "original_prompt": "What are the side effects of aspirin?",
     "llm_output": "Aspirin can cause stomach bleeding and should not be taken by patients with heart conditions according to Smith et al. (2023).",
     "relevant_documents": "Medical literature about aspirin safety and contraindications."
   }
   ```
5. **Click "Execute"** to see the analysis results

## Response Structure
```json
{
  "report_id": "report_1234",
  "analysis": {
    "hallucination_analysis": {
      "citations_found": 1,
      "citation_analysis": [...],
      "consistency_with_sources": {...},
      "risk_level": "MEDIUM"
    },
    "compliance_analysis": {
      "phi_violations": {...},
      "disclaimer_compliance": {...},
      "compliance_score": 85,
      "overall_status": "MOSTLY_COMPLIANT"
    },
    "combined_assessment": {
      "overall_risk_level": "MEDIUM",
      "recommendation": "Review and address identified issues before use"
    }
  }
}
```

### Chat with Individual Agents
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check this citation for validity",
    "agent": "hallucination_guard"
  }'
```

## Agentic System Architecture

### 1. HallucinationGuard Agent
- **Purpose**: Main coordinator for hallucination detection
- **Sub-agents**: Citation Checker
- **Capabilities**:
  - Citation extraction and verification
  - Source consistency checking
  - Pattern-based hallucination detection
  - Risk level assessment

### 2. Citation Checker Agent
- **APIs Used**: PubMed API, Google Custom Search
- **Verification Methods**:
  - PMID validation via PubMed
  - DOI resolution checking
  - General web search verification
  - Citation-claim support analysis

### 3. Compliance Checker Agent
- **Standards**: HIPAA, Medical Practice Guidelines
- **Checks**:
  - PHI (Protected Health Information) detection
  - Required medical disclaimers
  - Emergency situation handling
  - Medical advice appropriateness

## Configuration

### How to Get API Keys

#### 1. Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. In the left sidebar, click **"Get API Key"**
4. Click **"Create API Key"** 
5. Choose **"Create API key in new project"** (or select existing project)
6. Copy the generated API key (starts with "AIza...")
7. Keep this key secure - don't share it publicly

#### 2. Google Search API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. **Create a new project** (or select existing):
   - Click the project dropdown at the top
   - Click "New Project"
   - Enter a project name (e.g., "Medical AI Analysis")
   - Click "Create"
4. **Enable the Custom Search API**:
   - In the left sidebar, go to **"APIs & Services" > "Library"**
   - Search for **"Custom Search API"**
   - Click on it and press **"Enable"**
5. **Create API credentials**:
   - Go to **"APIs & Services" > "Credentials"**
   - Click **"+ CREATE CREDENTIALS"**
   - Select **"API key"**
   - Copy the generated API key
   - (Optional) Click "Restrict Key" to limit usage to Custom Search API only
6. **Set up billing** (required for Google Search API):
   - Go to **"Billing"** in the left sidebar
   - Link a payment method (Google provides free credits for new users)

#### 3. Update Your .env File
Once you have both keys, update your `.env` file:
```
GOOGLE_API_KEY=AIza_your_actual_gemini_key_here
GOOGLE_SEARCH_API_KEY=_your_actual_search_key_here
GOOGLE_GEMINI_MODEL=gemini-flash-2.5
FLASK_ENV=development
FLASK_DEBUG=True
```

### Important Notes
- ⚠️ **Keep your API keys secure** - never commit them to version control
- 💳 **Google Search API** requires billing setup but has generous free quotas
- 🆓 **Google Gemini API** has a free tier with rate limits
- 🔄 **Restart your server** after updating the `.env` file

### API Usage Limits
- **Gemini API**: Free tier includes 15 requests per minute
- **Search API**: 100 free queries per day, then $5 per 1000 queries

### Environment Variables
- `GOOGLE_API_KEY`: Your Gemini API key
- `GOOGLE_SEARCH_API_KEY`: Your Google Search API key
- `GOOGLE_GEMINI_MODEL`: Gemini model to use (default: gemini-pro)
- `FLASK_ENV`: Development or production
- `FLASK_DEBUG`: True/False for debug mode

## Risk Levels

- **LOW**: Content appears safe for use
- **MEDIUM**: Minor issues detected, review recommended
- **HIGH**: Significant issues, major revision needed
- **CRITICAL**: Serious violations, content unsafe for use

## Project Structure

```
backend/
├── app.py                     # Main FastAPI application with /report endpoint
├── config.py                  # Configuration settings
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables
├── README.md                  # This documentation
└── agents/
    ├── __init__.py            # Package initialization
    ├── base_agent.py          # Abstract base agent and manager
    ├── gemini_agent.py        # Basic Gemini agent
    ├── hallucination_guard.py # Main hallucination detection agent
    ├── citation_checker.py    # Citation verification sub-agent
    └── compliance_checker.py  # HIPAA/medical compliance agent
```

## Development Notes

- Built with FastAPI for high performance and automatic API documentation
- The system uses Google's Gemini Pro model for AI analysis
- PubMed integration provides medical citation verification
- Modular agent architecture allows easy extension
- Comprehensive logging for debugging and monitoring
- Type validation with Pydantic models
- Async support for better scalability