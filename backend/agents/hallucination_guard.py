import google.generativeai as genai
import os
import json
import re
from datetime import datetime
from typing import Dict, List, Optional
import logging
from .base_agent import BaseAgent
from .citation_checker import CitationCheckerAgent

logger = logging.getLogger(__name__)

class HallucinationGuardAgent(BaseAgent):
    """Main agent that coordinates hallucination detection using sub-agents."""
    
    def __init__(self):
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.model_name = os.getenv('GOOGLE_GEMINI_MODEL', 'gemini-pro')  # Default to gemini-pro if not set
        
        genai.configure(api_key=self.google_api_key)
        self.model = genai.GenerativeModel(self.model_name)
        
        # Initialize sub-agents
        self.citation_checker = CitationCheckerAgent()
    
    def process_message(self, message: str) -> str:
        """Process hallucination detection request."""
        return "HallucinationGuard is ready for analysis. Use execute_task for full analysis."
    
    def execute_task(self, task: str, context: Dict = None) -> Dict:
        """Execute comprehensive hallucination detection."""
        if context is None:
            context = {}
        
        llm_output = context.get('llm_output', '')
        original_prompt = context.get('original_prompt', '')
        relevant_documents = context.get('relevant_documents', '')
        
        # Perform hallucination analysis
        result = self.analyze_hallucination(llm_output, original_prompt, relevant_documents)
        
        return {
            "task": task,
            "hallucination_analysis": result,
            "status": "completed"
        }
    
    def analyze_hallucination(self, llm_output: str, original_prompt: str, relevant_documents: str) -> Dict:
        """Comprehensive hallucination analysis."""
        try:
            # 1. Extract citations from LLM output
            citations = self.extract_citations(llm_output)
            
            # 2. Check each citation
            citation_results = []
            for citation in citations:
                # Find the claim this citation is supposed to support
                claim = self.find_claim_for_citation(llm_output, citation)
                
                verification_result = self.citation_checker.verify_citation_supports_claim(citation, claim)
                citation_results.append({
                    "citation": citation,
                    "claim": claim,
                    "verification": verification_result
                })
            
            # 3. Check consistency with source documents
            consistency_check = self.check_consistency_with_sources(llm_output, relevant_documents)
            
            # 4. Detect potential hallucination patterns
            hallucination_patterns = self.detect_hallucination_patterns(llm_output, original_prompt, relevant_documents)
            
            # 5. Generate overall assessment
            overall_assessment = self.generate_overall_assessment(citation_results, consistency_check, hallucination_patterns)
            
            return {
                "citations_found": len(citations),
                "citation_analysis": citation_results,
                "consistency_with_sources": consistency_check,
                "hallucination_patterns": hallucination_patterns,
                "overall_assessment": overall_assessment,
                "risk_level": self.calculate_risk_level(citation_results, consistency_check, hallucination_patterns)
            }
            
        except Exception as e:
            logger.error(f"Error in hallucination analysis: {str(e)}")
            return {
                "error": str(e),
                "risk_level": "UNKNOWN"
            }
    
    def extract_citations(self, text: str) -> List[str]:
        """Extract citations from text."""
        citation_patterns = [
            r'\([^)]*\d{4}[^)]*\)',  # (Author, 2023) style
            r'\[[^\]]*\]',           # [1], [Author, 2023] style
            r'doi[:\s]*[^\s]+',      # DOI citations
            r'PMID[:\s]*\d+',        # PubMed IDs
            r'http[s]?://[^\s]+',    # URLs
        ]
        
        citations = []
        for pattern in citation_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            citations.extend(matches)
        
        return list(set(citations))  # Remove duplicates
    
    def find_claim_for_citation(self, text: str, citation: str) -> str:
        """Find the claim that a citation is supposed to support."""
        try:
            # Find the sentence containing the citation
            sentences = text.split('.')
            for sentence in sentences:
                if citation in sentence:
                    # Return the sentence without the citation
                    return sentence.replace(citation, '').strip()
            return "Could not determine specific claim"
        except:
            return "Could not determine specific claim"
    
    def check_consistency_with_sources(self, llm_output: str, relevant_documents: str) -> Dict:
        """Check if LLM output is consistent with provided source documents."""
        try:
            prompt = f"""
            Compare the LLM output with the provided source documents and analyze consistency:
            
            LLM Output:
            {llm_output}
            
            Source Documents:
            {relevant_documents}
            
            Please analyze:
            1. Are the facts in the LLM output supported by the source documents?
            2. Are there any contradictions?
            3. Are there claims made without source support?
            4. Consistency score (0-100)
            
            Provide detailed analysis in JSON format.
            """
            
            response = self.model.generate_content(prompt)
            
            return {
                "analysis": response.text,
                "timestamp": str(datetime.now())
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def detect_hallucination_patterns(self, llm_output: str, original_prompt: str, relevant_documents: str) -> Dict:
        """Detect common hallucination patterns."""
        try:
            prompt = f"""
            Analyze the following for potential hallucination patterns:
            
            Original Prompt: {original_prompt}
            LLM Output: {llm_output}
            Available Sources: {relevant_documents}
            
            Look for these hallucination indicators:
            1. Overly specific claims without citations
            2. Statistics or numbers not found in sources
            3. Recent events or dates not in source material
            4. Technical details that seem fabricated
            5. Contradictions within the output itself
            6. Claims that go beyond what sources actually say
            
            Rate each category as: NONE, LOW, MEDIUM, HIGH risk
            Provide specific examples where found.
            
            Format as structured JSON.
            """
            
            response = self.model.generate_content(prompt)
            
            return {
                "pattern_analysis": response.text,
                "timestamp": str(datetime.now())
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def generate_overall_assessment(self, citation_results: List, consistency_check: Dict, hallucination_patterns: Dict) -> Dict:
        """Generate overall hallucination risk assessment."""
        try:
            # Calculate citation validity rate
            valid_citations = sum(1 for result in citation_results if "✓" in str(result.get("verification", {})))
            total_citations = len(citation_results)
            citation_validity_rate = valid_citations / total_citations if total_citations > 0 else 1.0
            
            # Use Gemini to generate comprehensive assessment
            prompt = f"""
            Generate a comprehensive hallucination risk assessment based on:
            
            Citation Analysis: {json.dumps(citation_results, indent=2)}
            Consistency Check: {json.dumps(consistency_check, indent=2)}
            Hallucination Patterns: {json.dumps(hallucination_patterns, indent=2)}
            
            Citation Validity Rate: {citation_validity_rate:.2f}
            
            Provide:
            1. Overall risk level (LOW/MEDIUM/HIGH/CRITICAL)
            2. Key concerns identified
            3. Recommendations for improvement
            4. Confidence in assessment
            
            Format as JSON.
            """
            
            response = self.model.generate_content(prompt)
            
            return {
                "assessment": response.text,
                "citation_validity_rate": citation_validity_rate,
                "timestamp": str(datetime.now())
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def calculate_risk_level(self, citation_results: List, consistency_check: Dict, hallucination_patterns: Dict) -> str:
        """Calculate overall risk level."""
        try:
            # Simple scoring system
            score = 0
            
            # Citation scoring
            valid_citations = sum(1 for result in citation_results if "✓" in str(result.get("verification", {})))
            total_citations = len(citation_results)
            if total_citations > 0:
                citation_score = valid_citations / total_citations
                score += citation_score * 40  # 40% weight for citations
            else:
                score += 20  # Penalty for no citations
            
            # Add more sophisticated scoring logic here
            
            if score >= 80:
                return "LOW"
            elif score >= 60:
                return "MEDIUM"
            elif score >= 40:
                return "HIGH"
            else:
                return "CRITICAL"
                
        except Exception as e:
            return "UNKNOWN"