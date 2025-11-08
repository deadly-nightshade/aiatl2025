# Flask API with Google Gemini Agentic System

This is a Flask API that implements a comprehensive agentic system using Google Gemini AI for medical content analysis, hallucination detection, and compliance checking.

## Features

- **HallucinationGuard Agent**: Detects potential hallucinations in LLM outputs
- **Citation Checker Agent**: Verifies citations against PubMed, DOI, and web sources  
- **Compliance Checker Agent**: Ensures HIPAA and medical compliance
- **Integrated Analysis**: Comprehensive reporting with risk assessment

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file and add your API keys:
   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   GOOGLE_CSE_ID=your_google_custom_search_engine_id_here
   FLASK_ENV=development
   FLASK_DEBUG=True
   ```

3. Run the application:
   ```bash
   python app.py
   ```

## API Endpoints

### Main Analysis Endpoint
- `POST /api/report` - **Primary endpoint for content analysis**

### Other Endpoints
- `GET /` - Health check
- `POST /api/chat` - Chat with individual agents
- `POST /api/agent/task` - Execute specific agent tasks
- `GET /api/agents` - List available agents
- `GET /api/history/<agent_name>` - Get conversation history
- `DELETE /api/history/<agent_name>` - Clear conversation history

## Usage Examples

### Comprehensive Content Analysis
```bash
curl -X POST http://localhost:5000/api/report \
  -H "Content-Type: application/json" \
  -d '{
    "original_prompt": "What are the side effects of aspirin?",
    "llm_output": "Aspirin can cause stomach bleeding and should not be taken by patients with heart conditions according to Smith et al. (2023).",
    "relevant_documents": "Medical literature about aspirin safety and contraindications..."
  }'
```

### Response Structure
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

### Required API Keys
1. **Google Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/)
2. **Google Custom Search Engine ID**: Create at [Google Custom Search](https://cse.google.com/)

### Environment Variables
- `GOOGLE_API_KEY`: Your Gemini API key
- `GOOGLE_CSE_ID`: Custom Search Engine ID for citation verification
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
├── app.py                     # Main Flask application with /report endpoint
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

- The system uses Google's Gemini Pro model for AI analysis
- PubMed integration provides medical citation verification
- Modular agent architecture allows easy extension
- Comprehensive logging for debugging and monitoring
- Error handling with graceful degradation