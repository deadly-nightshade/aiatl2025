import uuid
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from datetime import datetime
import os

from agents.gemini_agent import GeminiAgent
from agents.base_agent import AgentManager
from agents.hallucination_guard import HallucinationGuardAgent
from agents.compliance_checker import ComplianceCheckerAgent

# Load environment variables
load_dotenv()

# Pydantic models for request/response validation
class ReportRequest(BaseModel):
    original_prompt: str
    llm_output: str
    relevant_documents: Optional[str] = ""

class ChatRequest(BaseModel):
    message: str
    agent: Optional[str] = "gemini"

class TaskRequest(BaseModel):
    task: str
    context: Optional[Dict[str, Any]] = {}
    agent: Optional[str] = "gemini"

class BotOutputRequest(BaseModel):
    prompt: str
    response: str
    metadata: Optional[Dict[str, Any]] = None
    relevant_documents: Optional[str] = ""

# In-memory stores
bot_outputs: List[Dict[str, Any]] = []
bot_reports: Dict[str, Dict[str, Any]] = {}

# Initialize FastAPI app
app = FastAPI(
    title="Medical AI Analysis API",
    description="Agentic system for hallucination detection and compliance checking in medical AI outputs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agent manager with all agents
agent_manager = AgentManager()

# Register agents
gemini_agent = GeminiAgent()
hallucination_guard = HallucinationGuardAgent()
compliance_checker = ComplianceCheckerAgent()

agent_manager.register_agent('gemini', gemini_agent, is_default=True)
agent_manager.register_agent('hallucination_guard', hallucination_guard)
agent_manager.register_agent('compliance_checker', compliance_checker)

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {"message": "FastAPI Medical AI Analysis System is running!", "status": "healthy"}

def run_full_analysis(original_prompt: str, llm_output: str, relevant_documents: str = "") -> Dict[str, Any]:
    context = {
        "original_prompt": original_prompt,
        "llm_output": llm_output,
        "relevant_documents": relevant_documents,
    }

    hallucination_result = hallucination_guard.execute_task(
        "hallucination_detection",
        context,
    )

    compliance_result = compliance_checker.execute_task(
        "compliance_check",
        context,
    )

    combined_assessment = generate_combined_assessment(
        hallucination_result,
        compliance_result,
        original_prompt,
        llm_output,
    )

    return {
        "report_id": f"report_{hash(original_prompt + llm_output) % 10000}",
        "analysis": {
            "hallucination_analysis": hallucination_result,
            "compliance_analysis": compliance_result,
            "combined_assessment": combined_assessment,
        },
        "input_summary": {
            "prompt_length": len(original_prompt),
            "output_length": len(llm_output),
            "has_documents": bool(relevant_documents),
        },
        "status": "completed",
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.post("/api/report")
async def generate_report(request: ReportRequest):
    """
    Main report endpoint that analyzes LLM output for hallucinations and compliance.
    
    - **original_prompt**: The original prompt sent to the LLM
    - **llm_output**: The LLM's response that needs to be analyzed
    - **relevant_documents**: Optional source documents used to generate the response
    """
    try:
        return run_full_analysis(
            original_prompt=request.original_prompt,
            llm_output=request.llm_output,
            relevant_documents=request.relevant_documents or "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Background task for analysis
async def analyze_and_update(response_id: str, prompt: str, assistant_response: str, relevant_documents: str = ""):
    try:
        report = run_full_analysis(prompt, assistant_response, relevant_documents)
        bot_reports[response_id] = report

        for entry in bot_outputs:
            if entry["id"] == response_id:
                entry["status"] = "warning" if report["analysis"]["combined_assessment"].get("overall_risk_level") in {"HIGH", "CRITICAL"} else "verified"
                entry["reportId"] = report["report_id"]
                entry.setdefault("metadata", {})["reportKey"] = response_id
                entry.setdefault("metadata", {})["reportId"] = report["report_id"]
                entry["updatedAt"] = datetime.utcnow().isoformat()
                break
    except Exception as err:
        for entry in bot_outputs:
            if entry["id"] == response_id:
                entry["status"] = "failed"
                entry.setdefault("metadata", {})["reportKey"] = response_id
                entry.setdefault("metadata", {})["verificationError"] = str(err)
                entry["updatedAt"] = datetime.utcnow().isoformat()
                break

def generate_combined_assessment(hallucination_result, compliance_result, original_prompt, llm_output):
    """Generate a combined risk assessment from both analyses."""
    try:
        # Extract risk levels
        hallucination_risk = hallucination_result.get('hallucination_analysis', {}).get('risk_level', 'UNKNOWN')
        compliance_score = compliance_result.get('compliance_analysis', {}).get('compliance_score', 0)
        compliance_status = compliance_result.get('compliance_analysis', {}).get('overall_status', 'UNKNOWN')
        
        # Calculate overall risk
        risk_factors = []
        
        if hallucination_risk in ['HIGH', 'CRITICAL']:
            risk_factors.append("High hallucination risk detected")
        
        if compliance_score < 70:
            risk_factors.append("Compliance issues identified")
            
        if compliance_status in ['NON_COMPLIANT', 'PARTIALLY_COMPLIANT']:
            risk_factors.append("HIPAA/medical compliance concerns")
        
        # Determine overall recommendation
        if not risk_factors:
            overall_risk = "LOW"
            recommendation = "Content appears safe for use"
        elif len(risk_factors) == 1:
            overall_risk = "MEDIUM"
            recommendation = "Review and address identified issues before use"
        else:
            overall_risk = "HIGH"
            recommendation = "Significant issues detected - content requires major revision"
        
        return {
            "overall_risk_level": overall_risk,
            "risk_factors": risk_factors,
            "recommendation": recommendation,
            "hallucination_risk": hallucination_risk,
            "compliance_score": compliance_score,
            "compliance_status": compliance_status,
            "summary": f"Analysis complete: {overall_risk} risk level identified with {len(risk_factors)} major concerns."
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "overall_risk_level": "UNKNOWN"
        }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Chat with individual agents"""
    try:
        # Get agent and process message
        agent = agent_manager.get_agent(request.agent)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent '{request.agent}' not found")
        
        response = agent.process_message(request.message)
        
        return {
            "message": response,
            "agent": request.agent,
            "status": "success"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/task")
async def execute_task(request: TaskRequest):
    """Execute a specific task with an agent"""
    try:
        # Get agent and execute task
        agent = agent_manager.get_agent(request.agent)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent '{request.agent}' not found")
        
        result = agent.execute_task(request.task, request.context)
        
        return {
            "result": result,
            "agent": request.agent,
            "status": "success"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents")
async def list_agents():
    """List all available agents"""
    return {
        "agents": agent_manager.list_agents(),
        "default": agent_manager.default_agent
    }

@app.get("/api/history/{agent_name}")
async def get_history(agent_name: str):
    """Get conversation history for a specific agent"""
    try:
        agent = agent_manager.get_agent(agent_name)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
        
        if hasattr(agent, 'get_conversation_history'):
            history = agent.get_conversation_history()
            return {"history": history}
        else:
            raise HTTPException(status_code=400, detail="Agent does not support history")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/history/{agent_name}")
async def clear_history(agent_name: str):
    """Clear conversation history for a specific agent"""
    try:
        agent = agent_manager.get_agent(agent_name)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
        
        if hasattr(agent, 'clear_history'):
            agent.clear_history()
            return {"message": f"History cleared for agent '{agent_name}'"}
        else:
            raise HTTPException(status_code=400, detail="Agent does not support history")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bot-output")
async def list_bot_outputs(after: Optional[str] = None):
    if after:
        for idx, entry in enumerate(bot_outputs):
            if entry["id"] == after:
                return bot_outputs[idx + 1 :]
        return []
    return bot_outputs

@app.post("/api/bot-output")
async def ingest_bot_output(request: BotOutputRequest, background_tasks: BackgroundTasks):
    conversation_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()

    user_entry = {
        "id": str(uuid.uuid4()),
        "content": request.prompt,
        "createdAt": created_at,
        "metadata": {
            "pairId": conversation_id,
            **(request.metadata or {}),
        },
        "role": "user",
        "status": "pending",
    }

    assistant_id = str(uuid.uuid4())
    assistant_entry = {
        "id": assistant_id,
        "content": request.response,
        "createdAt": created_at,
        "metadata": {
            "pairId": conversation_id,
            "reportKey": assistant_id,
            **(request.metadata or {}),
        },
        "role": "assistant",
        "status": "pending",
    }

    bot_outputs.extend([user_entry, assistant_entry])

    background_tasks.add_task(
        analyze_and_update,
        response_id=assistant_id,
        prompt=request.prompt,
        assistant_response=request.response,
        relevant_documents=request.relevant_documents or "",
    )

    return assistant_entry

@app.get("/api/report/{response_id}")
async def get_stored_report(response_id: str):
    report = bot_reports.get(response_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not ready")
    return report

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, reload=True)