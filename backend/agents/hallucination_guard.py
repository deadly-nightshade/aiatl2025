import google.generativeai as genai
import os
import json
import re
from datetime import datetime
from typing import Dict, List, Optional
import logging
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

class HallucinationGuardAgent(BaseAgent):
    """Streamlined agent for hallucination detection using faithfulness metrics."""
    
    def __init__(self):
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.model_name = os.getenv('GOOGLE_GEMINI_MODEL', 'gemini-pro')
        
        genai.configure(api_key=self.google_api_key)
        self.model = genai.GenerativeModel(self.model_name)
    
    def process_message(self, message: str) -> str:
        """Process hallucination detection request."""
        return "HallucinationGuard is ready for analysis. Use execute_task for full analysis."
    
    def execute_task(self, task: str, context: Dict = None) -> Dict:
        """Execute streamlined hallucination detection."""
        if context is None:
            context = {}
        
        llm_output = context.get('llm_output', '')
        original_prompt = context.get('original_prompt', '')
        relevant_documents = context.get('relevant_documents', '')
        
        # Perform focused hallucination analysis
        result = self.analyze_faithfulness(llm_output, original_prompt, relevant_documents)
        
        return {
            "task": task,
            "hallucination_analysis": result,
            "status": "completed"
        }
    
    def analyze_faithfulness(self, llm_output: str, original_prompt: str, relevant_documents: str) -> Dict:
        """Analyze faithfulness using established metrics."""
        try:
            # 1. Calculate faithfulness confidence score
            confidence_score, reasoning = self.calculate_faithfulness_score(llm_output, relevant_documents)
            
            # 2. Detect specific issues
            issues_detected = self.detect_hallucination_issues(llm_output, relevant_documents)
            
            # 3. Analyze citations
            citation_analysis = self.analyze_citations_detailed(llm_output)
            
            # 4. Determine overall risk level
            risk_level = self.determine_risk_level(confidence_score, issues_detected)
            
            return {
                "confidence_score": confidence_score,
                "reasoning": reasoning,
                "issues_detected": issues_detected,
                "citation_analysis": citation_analysis,
                "risk_level": risk_level,
                "total_issues": len(issues_detected),
                "total_citations": len(citation_analysis),
                "timestamp": str(datetime.now())
            }
            
        except Exception as e:
            logger.error(f"Error in faithfulness analysis: {str(e)}")
            return {
                "error": str(e),
                "confidence_score": 0,
                "risk_level": "UNKNOWN",
                "issues_detected": [],
                "citation_analysis": []
            }
    
    def calculate_faithfulness_score(self, llm_output: str, relevant_documents: str) -> tuple:
        """Calculate faithfulness confidence score using established metrics."""
        try:
            # Use Gemini with faithfulness-focused prompt
            prompt = f"""
            Evaluate the faithfulness of this AI response using established faithfulness metrics:

            Response: "{llm_output}"
            Source Documents: "{relevant_documents[:1000] if relevant_documents else 'No source documents provided'}"

            Analyze faithfulness based on:
            1. **Factual Consistency**: Are all facts in the response supported by or consistent with the source documents?
            2. **Source Attribution**: Are claims properly grounded in the provided sources?
            3. **Inference Validity**: Are any inferences made reasonable and supported?
            4. **Absence of Fabrication**: Are there any facts that appear to be made up or not derivable from sources?
            5. **Contextual Accuracy**: Is the response contextually appropriate to the source material?

            Provide:
            - A faithfulness confidence score (0-100): How confident are you that this response is faithful to the sources?
            - Detailed reasoning: Explain your score with specific examples

            Format as JSON:
            {{
                "confidence_score": <0-100>,
                "reasoning": "Detailed explanation of score with specific examples..."
            }}
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse the response
            try:
                # Try to extract JSON
                result = json.loads(response.text.replace('```json', '').replace('```', '').strip())
                return result.get('confidence_score', 50), result.get('reasoning', response.text)
            except:
                # Fallback: extract score from text
                score_match = re.search(r'confidence[_\s]*score["\s:]*(\d+)', response.text, re.IGNORECASE)
                score = int(score_match.group(1)) if score_match else 50
                return score, response.text
                
        except Exception as e:
            logger.warning(f"Faithfulness scoring failed: {e}")
            return 50, f"Error in analysis: {str(e)}"
    
    def detect_hallucination_issues(self, llm_output: str, relevant_documents: str) -> List[Dict]:
        """Detect consolidated hallucination issues across the entire response."""
        issues = []
        
        try:
            # Use AI to detect overall issues in the response
            prompt = f"""
            Analyze this AI response for hallucination issues:

            Response: "{llm_output}"
            Source Documents: "{relevant_documents[:800] if relevant_documents else 'No sources provided'}"

            Look for these consolidated hallucination patterns across the entire response:
            1. **Fabricated Details**: Specific facts, statistics, or details that appear made up
            2. **Unsupported Claims**: Statements not backed by the source documents
            3. **Contradictory Information**: Facts that contradict the source material
            4. **Unverifiable References**: Citations to studies, experts, or sources that can't be verified
            5. **Overly Specific Information**: Suspiciously precise data without proper backing

            For each issue type found, provide:
            - issue_type: Single word/phrase (e.g., "Fabricated Details", "Unsupported Claims")
            - description: Brief description of the problem
            - evidence: Key examples from the text
            - risk_level: LOW/MEDIUM/HIGH/CRITICAL
            - explanation: Why this is concerning

            Only report actual issues found. Return as JSON array.
            """
            
            response = self.model.generate_content(prompt)
            issues = self.parse_consolidated_issues(response.text, llm_output)
            
        except Exception as e:
            logger.warning(f"Issue detection failed: {e}")
            issues.append({
                "issue_type": "Analysis Error",
                "description": f"Failed to analyze response",
                "evidence": "N/A",
                "risk_level": "MEDIUM",
                "explanation": "Unable to complete hallucination analysis"
            })
        
        return issues
    
    def parse_consolidated_issues(self, ai_response: str, original_text: str) -> List[Dict]:
        """Parse consolidated issues from AI response."""
        issues = []
        
        try:
            # Clean up the response
            cleaned_response = ai_response.replace('```json', '').replace('```', '').strip()
            
            # Look for JSON array
            json_match = re.search(r'\[.*\]', cleaned_response, re.DOTALL)
            if json_match:
                parsed_issues = json.loads(json_match.group(0))
                for issue in parsed_issues:
                    if isinstance(issue, dict):
                        issues.append({
                            "issue_type": issue.get('issue_type', 'Unknown Issue'),
                            "description": issue.get('description', 'No description'),
                            "evidence": issue.get('evidence', 'No evidence'),
                            "risk_level": issue.get('risk_level', 'MEDIUM'),
                            "explanation": issue.get('explanation', 'No explanation')
                        })
            else:
                # Fallback: use pattern-based detection
                issues = self.fallback_consolidated_detection(original_text)
                        
        except Exception as e:
            logger.warning(f"Failed to parse consolidated issues: {e}")
            # Fallback: use pattern-based detection
            issues = self.fallback_consolidated_detection(original_text)
        
        return issues
    
    def fallback_consolidated_detection(self, text: str) -> List[Dict]:
        """Fallback consolidated issue detection using pattern matching."""
        issues = []
        
        # Check for overly specific information
        if re.search(r'\b\d+\.\d{2,}%|\b\d+\.\d{3,}', text):
            issues.append({
                "issue_type": "Fabricated Details",
                "description": "Contains suspiciously precise statistics or numbers",
                "evidence": str(re.findall(r'\b\d+\.\d{2,}%|\b\d+\.\d{3,}', text)[:3]),
                "risk_level": "HIGH",
                "explanation": "Precise numbers without proper sourcing often indicate fabrication"
            })
        
        # Check for unverifiable references
        if re.search(r'\b(?:studies show|research proves|experts say|according to studies)\b', text, re.IGNORECASE):
            issues.append({
                "issue_type": "Unverifiable References", 
                "description": "References vague studies or experts without proper citation",
                "evidence": str(re.findall(r'\b(?:studies show|research proves|experts say|according to studies)\b', text, re.IGNORECASE)[:3]),
                "risk_level": "HIGH",
                "explanation": "Vague references to studies without specific citations are red flags"
            })
        
        # Check for absolute statements
        if re.search(r'\b(?:always|never|all|every|none)\s+(?:causes?|leads? to|results? in|prevents?)\b', text, re.IGNORECASE):
            issues.append({
                "issue_type": "Unsupported Claims",
                "description": "Makes absolute statements about medical effects",
                "evidence": str(re.findall(r'\b(?:always|never|all|every|none)\s+(?:causes?|leads? to|results? in|prevents?)\b', text, re.IGNORECASE)[:2]),
                "risk_level": "MEDIUM",
                "explanation": "Absolute medical statements are rarely accurate and often indicate oversimplification"
            })
        
        return issues
    
    def analyze_citations_detailed(self, text: str) -> List[Dict]:
        """Analyze citations only when actual citations are found."""
        citations = []
        
        try:
            # First check if there are any actual citations
            citation_patterns = [
                r'\([^)]*\d{4}[^)]*\)',  # (Author, 2023)
                r'\[[^\]]*\d+[^\]]*\]',  # [1], [Author, 2023] with numbers
                r'doi[:\s]*[^\s]+',      # DOI
                r'PMID[:\s]*\d+',        # PubMed IDs
                r'http[s]?://[^\s]+',    # URLs
            ]
            
            found_citations = []
            for pattern in citation_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                found_citations.extend(matches)
            
            # Only proceed if we found actual citations
            if not found_citations:
                return citations
            
            # Analyze each unique citation
            for i, citation in enumerate(set(found_citations)):
                if len(citation.strip()) > 3:  # Skip very short matches
                    citation_assessment = self.assess_single_citation(citation, text)
                    citations.append({
                        "citation": citation,
                        "assessment": citation_assessment["assessment"],
                        "risk_level": citation_assessment["risk_level"],
                        "explanation": citation_assessment["explanation"],
                        "completeness_score": citation_assessment["completeness_score"]
                    })
                
        except Exception as e:
            logger.warning(f"Citation analysis failed: {e}")
        
        return citations
    
    def parse_sentence_assessment(self, ai_response: str) -> Dict:
        """Parse AI assessment of a sentence."""
        try:
            # Clean up the response
            cleaned = ai_response.replace('```json', '').replace('```', '').strip()
            
            # Try to parse as JSON
            result = json.loads(cleaned)
            return result
            
        except json.JSONDecodeError:
            # Fallback: look for key indicators in text
            has_issues = any(keyword in ai_response.lower() for keyword in [
                'has_issues": true', 'problematic', 'concerning', 'fabricated', 
                'unsupported', 'contradicts', 'unverifiable'
            ])
            
            if has_issues:
                # Extract risk level
                risk_level = "MEDIUM"
                if "critical" in ai_response.lower() or "high" in ai_response.lower():
                    risk_level = "HIGH"
                elif "low" in ai_response.lower():
                    risk_level = "LOW"
                
                return {
                    "has_issues": True,
                    "issue_type": "Potential Issue",
                    "risk_level": risk_level,
                    "explanation": ai_response[:200] + "..." if len(ai_response) > 200 else ai_response
                }
            
            return {"has_issues": False}
        
        except Exception:
            return {"has_issues": False}
    
    def assess_single_citation(self, citation: str, full_text: str) -> Dict:
        """Assess a single citation for completeness and validity."""
        try:
            prompt = f"""
            Evaluate this citation for academic/scientific validity:

            Citation: "{citation}"
            Context: "{full_text[:300]}..."

            Assess:
            1. **Completeness**: Does it have author, year, title, journal/source?
            2. **Format**: Is it properly formatted?
            3. **Verifiability**: Can this citation reasonably be verified?
            4. **Contextual Appropriateness**: Does it fit the claim being made?

            Rate overall citation quality:
            - completeness_score: 0-100 (how complete is the citation?)
            - risk_level: LOW/MEDIUM/HIGH (risk of being fabricated/invalid)
            - assessment: Brief assessment of citation quality
            - explanation: Why you gave this rating

            Format as JSON.
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse response
            try:
                result = json.loads(response.text.replace('```json', '').replace('```', '').strip())
                return {
                    "assessment": result.get('assessment', 'Unable to assess'),
                    "risk_level": result.get('risk_level', 'MEDIUM'),
                    "explanation": result.get('explanation', 'No explanation provided'),
                    "completeness_score": result.get('completeness_score', 50)
                }
            except:
                return {
                    "assessment": response.text[:200],
                    "risk_level": "MEDIUM",
                    "explanation": "Failed to parse citation assessment",
                    "completeness_score": 50
                }
                
        except Exception as e:
            return {
                "assessment": f"Error analyzing citation: {str(e)}",
                "risk_level": "HIGH",
                "explanation": "Citation analysis failed",
                "completeness_score": 0
            }
    
    def parse_issues_from_response(self, ai_response: str, original_text: str) -> List[Dict]:
        """Parse hallucination issues from AI response."""
        issues = []
        
        try:
            # Try to parse JSON
            cleaned_response = ai_response.replace('```json', '').replace('```', '').strip()
            
            # Look for JSON array
            json_match = re.search(r'\[.*\]', cleaned_response, re.DOTALL)
            if json_match:
                parsed_issues = json.loads(json_match.group(0))
                for issue in parsed_issues:
                    if isinstance(issue, dict):
                        issues.append({
                            "issue_type": issue.get('issue_type', 'Unknown'),
                            "description": issue.get('description', 'No description'),
                            "evidence": issue.get('evidence', 'No evidence'),
                            "risk_level": issue.get('risk_level', 'MEDIUM'),
                            "explanation": issue.get('explanation', 'No explanation')
                        })
                        
        except Exception as e:
            # Fallback: look for obvious issues in the text
            issues = self.fallback_issue_detection(original_text)
        
        return issues[:5]  # Limit to 5 most important issues
    
    def fallback_issue_detection(self, text: str) -> List[Dict]:
        """Fallback issue detection using pattern matching."""
        issues = []
        
        # Check for suspicious patterns
        patterns = {
            "Precise Statistics": (r'\b\d+\.\d{2,}%', "HIGH"),
            "Specific Dates": (r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b', "MEDIUM"),
            "Unverifiable Claims": (r'\b(?:studies show|research proves|experts say|according to studies)\b', "HIGH"),
            "Absolute Statements": (r'\b(?:always|never|all|every|none|definitely|certainly)\s+(?:causes?|leads? to|results? in)\b', "MEDIUM")
        }
        
        for issue_type, (pattern, risk_level) in patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches[:2]:  # Limit matches per pattern
                issues.append({
                    "issue_type": issue_type,
                    "description": f"Potentially problematic {issue_type.lower()}",
                    "evidence": match,
                    "risk_level": risk_level,
                    "explanation": f"Pattern '{match}' may indicate fabricated or overly specific information"
                })
        
        return issues
    
    def determine_risk_level(self, confidence_score: float, issues: List[Dict]) -> str:
        """Determine overall risk level based on confidence and issues."""
        if confidence_score >= 85 and len(issues) == 0:
            return "LOW"
        elif confidence_score >= 70 and len([i for i in issues if i['risk_level'] in ['HIGH', 'CRITICAL']]) == 0:
            return "LOW"
        elif confidence_score >= 50 and len([i for i in issues if i['risk_level'] == 'CRITICAL']) == 0:
            return "MEDIUM"
        elif confidence_score >= 30:
            return "HIGH"
        else:
            return "CRITICAL"