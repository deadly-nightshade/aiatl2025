import google.generativeai as genai
import os
import json
import re
import subprocess
import time
from datetime import datetime
from typing import Dict, List, Optional
import logging
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

class HallucinationGuardAgent(BaseAgent):
    """MCP-enabled agent for hallucination detection using Google Search and web fetching."""
    
    def __init__(self):
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.model_name = os.getenv('GOOGLE_GEMINI_MODEL', 'gemini-pro')
        
        genai.configure(api_key=self.google_api_key)
        self.model = genai.GenerativeModel(self.model_name)
    
    def process_message(self, message: str) -> str:
        """Process hallucination detection request."""
        return "HallucinationGuard with MCP is ready for real-time verification."
    
    def execute_task(self, task: str, context: Dict = None) -> Dict:
        """Execute MCP-enabled hallucination detection with real-time search verification."""
        if context is None:
            context = {}
        
        llm_output = context.get('llm_output', '')
        original_prompt = context.get('original_prompt', '')
        
        # No longer need relevant_documents - we'll search in real-time
        result = self.analyze_with_mcp_verification(llm_output, original_prompt)
        
        return {
            "task": task,
            "hallucination_analysis": result,
            "status": "completed"
        }
    
    def analyze_with_mcp_verification(self, llm_output: str, original_prompt: str) -> Dict:
        """Analyze response using MCP for real-time fact verification."""
        try:
            # 1. Extract key claims for verification
            claims = self.extract_verifiable_claims(llm_output)
            
            # 2. Verify each claim using MCP search + fetch
            verified_claims = []
            for claim in claims:
                verification_result = self.verify_claim_with_mcp(claim)
                logger.info(
                    "Claim verification result",
                    extra={
                        "claim": claim,
                        "status": verification_result.get("verification_status"),
                        "confidence": verification_result.get("confidence"),
                    },
                )
                verified_claims.append(verification_result)
            
            # 3. Calculate overall confidence based on verifications
            confidence_score, reasoning = self.calculate_mcp_confidence(verified_claims, llm_output)
            
            # 4. Detect remaining issues
            issues_detected = self.detect_issues_from_verifications(verified_claims)
            
            # 5. Check citations if any exist
            citation_analysis = self.analyze_citations_with_mcp(llm_output)
            
            # 6. Determine overall risk level
            risk_level = self.determine_risk_level(confidence_score, issues_detected)
            
            return {
                "confidence_score": confidence_score,
                "reasoning": reasoning,
                "issues_detected": issues_detected,
                "citation_analysis": citation_analysis,
                "claim_verifications": verified_claims,
                "risk_level": risk_level,
                "total_issues": len(issues_detected),
                "total_citations": len(citation_analysis),
                "timestamp": str(datetime.now())
            }
            
        except Exception as e:
            logger.error(f"Error in MCP hallucination analysis: {str(e)}")
            return {
                "error": str(e),
                "confidence_score": 0,
                "risk_level": "UNKNOWN",
                "issues_detected": [],
                "citation_analysis": [],
                "claim_verifications": []
            }
    
    def extract_verifiable_claims(self, text: str) -> List[str]:
        """Extract key claims that can be fact-checked."""
        try:
            prompt = f"""
            Extract 3-5 key factual claims from this text that can be verified through web search:

            Text: "{text}"

            Focus on:
            - Specific medical/health facts
            - Statistics and numbers
            - Scientific claims
            - Attributions to studies or experts
            - Definitive statements about causes and effects

            Return only the claims as a JSON array of strings, e.g.:
            ["Aspirin reduces heart attack risk by 25%", "Studies show meditation improves focus"]
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                # Parse JSON response
                claims_text = response.text.strip()
                if claims_text.startswith('```json'):
                    claims_text = claims_text.replace('```json', '').replace('```', '').strip()
                
                claims = json.loads(claims_text)
                return claims[:5] if isinstance(claims, list) else []
                
            except json.JSONDecodeError:
                # Fallback: extract sentences with factual patterns
                return self.fallback_claim_extraction(text)
                
        except Exception as e:
            logger.warning(f"Claim extraction failed: {e}")
            return self.fallback_claim_extraction(text)
    
    def fallback_claim_extraction(self, text: str) -> List[str]:
        """Fallback claim extraction using patterns."""
        claims = []
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20 and any(pattern in sentence.lower() for pattern in [
                'study', 'research', 'percent', '%', 'cause', 'prevent', 'reduce', 'increase'
            ]):
                claims.append(sentence)
                
        return claims[:3]
    
    def verify_claim_with_mcp(self, claim: str) -> Dict:
        """Verify a single claim using MCP Google Search + Fetch."""
        try:
            logger.info(f"Verifying claim: {claim}")
            
            # Step 1: Search for information about the claim
            search_results = self.mcp_google_search(claim)
            
            if not search_results:
                return {
                    "claim": claim,
                    "verification_status": "No Search Results",
                    "evidence": "Could not find relevant search results",
                    "confidence": 0,
                    "sources": []
                }
            
            # Step 2: Fetch content from top search results
            fetched_content = []
            for result in search_results[:3]:  # Check top 3 results
                content = self.mcp_fetch_url(result['link'])
                if content:
                    fetched_content.append({
                        'title': result['title'],
                        'url': result['link'],
                        'content': content[:1500]  # Limit content length
                    })
            
            # Step 3: Analyze verification using AI
            verification_result = self.analyze_claim_verification(claim, fetched_content)
            
            return {
                "claim": claim,
                "verification_status": verification_result['status'],
                "evidence": verification_result['evidence'],
                "confidence": verification_result['confidence'],
                "sources": [{'title': c['title'], 'url': c['url']} for c in fetched_content]
            }
            
        except Exception as e:
            logger.error(f"Error verifying claim '{claim}': {e}")
            return {
                "claim": claim,
                "verification_status": "Verification Error",
                "evidence": f"Error during verification: {str(e)}",
                "confidence": 0,
                "sources": []
            }
    
    def mcp_google_search(self, query: str) -> List[Dict]:
        """Use MCP Google Search server to search."""
        try:
            # Create MCP client call to google search
            search_command = [
                "uvx", "mcp-google-cse"
            ]
            
            # Set environment variables for the MCP server
            env = os.environ.copy()
            env['API_KEY'] = os.getenv('GOOGLE_SEARCH_API_KEY')
            env['ENGINE_ID'] = os.getenv('GOOGLE_CSE_ID')
            
            # Create input for the MCP server
            mcp_input = {
                "method": "tools/call",
                "params": {
                    "name": "google_search",
                    "arguments": {
                        "search_term": query
                    }
                }
            }
            
            # For now, use direct API call as fallback
            return self.direct_google_search(query)
            
        except Exception as e:
            logger.warning(f"MCP search failed, using fallback: {e}")
            return self.direct_google_search(query)
    
    def direct_google_search(self, query: str) -> List[Dict]:
        """Direct Google Search API call as fallback."""
        try:
            import requests
            
            api_key = os.getenv('GOOGLE_SEARCH_API_KEY')
            engine_id = os.getenv('GOOGLE_CSE_ID')
            
            if not api_key or not engine_id:
                return []
            
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': api_key,
                'cx': engine_id,
                'q': query,
                'num': 5
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'items' in data:
                    return [
                        {
                            'title': item.get('title', ''),
                            'link': item.get('link', ''),
                            'snippet': item.get('snippet', '')
                        }
                        for item in data['items']
                    ]
            return []
            
        except Exception as e:
            logger.error(f"Direct search failed: {e}")
            return []
    
    def mcp_fetch_url(self, url: str) -> Optional[str]:
        """Use MCP Fetch server to get webpage content."""
        try:
            # For now, use direct fetching as fallback
            return self.direct_fetch_url(url)
            
        except Exception as e:
            logger.warning(f"MCP fetch failed: {e}")
            return None
    
    def direct_fetch_url(self, url: str) -> Optional[str]:
        """Direct URL fetching as fallback."""
        try:
            import requests
            from bs4 import BeautifulSoup
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                
                text = soup.get_text()
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                clean_text = ' '.join(chunk for chunk in chunks if chunk)
                
                return clean_text[:2000]  # Limit content
            return None
            
        except Exception as e:
            logger.warning(f"Direct fetch failed for {url}: {e}")
            return None
    
    def analyze_claim_verification(self, claim: str, fetched_content: List[Dict]) -> Dict:
        """Analyze fetched content to verify claim."""
        try:
            if not fetched_content:
                return {
                    "status": "No Content Found",
                    "evidence": "No web content could be retrieved for verification",
                    "confidence": 0
                }
            
            # Combine content from sources
            combined_content = "\n\n".join([
                f"Source: {c['title']}\nContent: {c['content']}"
                for c in fetched_content
            ])
            
            prompt = f"""
            Verify this claim against the web content found:

            Claim to verify: "{claim}"

            Web content from search:
            {combined_content}

            Analyze:
            1. Does the web content SUPPORT, CONTRADICT, or NOT ADDRESS the claim?
            2. What specific evidence supports your assessment?
            3. Confidence level (0-100): How confident are you in this verification?

            Respond with JSON:
            {{
                "status": "SUPPORTED|CONTRADICTED|NOT_ADDRESSED|INSUFFICIENT_INFO",
                "evidence": "Specific evidence from the sources",
                "confidence": 0-100
            }}
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                result = json.loads(response.text.replace('```json', '').replace('```', '').strip())
                return {
                    "status": result.get('status', 'UNKNOWN'),
                    "evidence": result.get('evidence', 'No evidence provided'),
                    "confidence": result.get('confidence', 50)
                }
            except json.JSONDecodeError:
                # Fallback parsing
                text = response.text.lower()
                if 'support' in text or 'confirm' in text:
                    status = 'SUPPORTED'
                    confidence = 75
                elif 'contradict' in text or 'disagree' in text:
                    status = 'CONTRADICTED'
                    confidence = 75
                else:
                    status = 'NOT_ADDRESSED'
                    confidence = 30
                    
                return {
                    "status": status,
                    "evidence": response.text[:200],
                    "confidence": confidence
                }
                
        except Exception as e:
            return {
                "status": "VERIFICATION_ERROR",
                "evidence": f"Error during verification: {str(e)}",
                "confidence": 0
            }
    
    def calculate_mcp_confidence(self, verified_claims: List[Dict], original_text: str) -> tuple:
        """Calculate confidence score based on claim verifications."""
        if not verified_claims:
            return 50, "No claims could be verified"
        
        # Calculate average confidence from verified claims
        total_confidence = 0
        supported_count = 0
        contradicted_count = 0
        
        for claim_result in verified_claims:
            confidence = claim_result.get('confidence', 0)
            status = claim_result.get('verification_status', 'UNKNOWN')
            
            total_confidence += confidence
            
            if status == 'SUPPORTED':
                supported_count += 1
            elif status == 'CONTRADICTED':
                contradicted_count += 1
        
        avg_confidence = total_confidence / len(verified_claims)
        
        # Adjust based on verification results
        if contradicted_count > 0:
            final_confidence = max(0, avg_confidence - (contradicted_count * 25))
        elif supported_count >= len(verified_claims) * 0.7:
            final_confidence = min(100, avg_confidence + 10)
        else:
            final_confidence = avg_confidence
        
        reasoning = f"Verified {len(verified_claims)} claims. {supported_count} supported, {contradicted_count} contradicted. Average source confidence: {avg_confidence:.1f}%"
        
        return int(final_confidence), reasoning
    
    def detect_issues_from_verifications(self, verified_claims: List[Dict]) -> List[Dict]:
        """Detect issues based on claim verifications."""
        issues = []
        
        for claim_result in verified_claims:
            status = claim_result.get('verification_status', 'UNKNOWN')
            claim = claim_result.get('claim', 'Unknown claim')
            evidence = claim_result.get('evidence', 'No evidence')
            
            if status == 'CONTRADICTED':
                issues.append({
                    "issue_type": "Contradicted Claim",
                    "description": "Claim contradicted by web sources",
                    "evidence": claim,
                    "risk_level": "HIGH",
                    "explanation": f"Web research contradicts this claim: {evidence}"
                })
            elif status == 'No Search Results':
                issues.append({
                    "issue_type": "Unverifiable Claim",
                    "description": "No web sources found for verification",
                    "evidence": claim,
                    "risk_level": "HIGH",
                    "explanation": "Could not find web sources to verify this claim"
                })
            elif status == 'Verification Error':
                issues.append({
                    "issue_type": "Verification Error",
                    "description": "Technical error during verification",
                    "evidence": claim,
                    "risk_level": "HIGH",
                    "explanation": evidence
                })
        
        return issues
    
    def analyze_citations_with_mcp(self, text: str) -> List[Dict]:
        """Analyze citations using MCP search and fetch."""
        citations = []
        
        try:
            # Extract citations
            citation_patterns = [
                r'\([^)]*\d{4}[^)]*\)',  # (Author, 2023)
                r'\[[^\]]*\d+[^\]]*\]',  # [1], [Author, 2023]
                r'doi[:\s]*[^\s]+',      # DOI
                r'PMID[:\s]*\d+',        # PubMed IDs
                r'http[s]?://[^\s]+',    # URLs
            ]
            
            found_citations = []
            for pattern in citation_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                found_citations.extend(matches)
            
            # Verify each citation using MCP
            for citation in set(found_citations):
                if len(citation.strip()) > 3:
                    verification = self.verify_citation_with_mcp(citation)
                    citations.append(verification)
        
        except Exception as e:
            logger.warning(f"Citation analysis failed: {e}")
        
        return citations
    
    def verify_citation_with_mcp(self, citation: str) -> Dict:
        """Verify citation using MCP search."""
        try:
            # Search for the citation
            search_results = self.mcp_google_search(citation)
            
            if search_results:
                # Use first result to assess citation
                first_result = search_results[0]
                content = self.mcp_fetch_url(first_result['link'])
                
                assessment = f"Found search results. Top result: {first_result['title']}"
                if content:
                    assessment += f"\nContent retrieved: {len(content)} characters"
                
                return {
                    "citation": citation,
                    "assessment": assessment,
                    "risk_level": "LOW" if content else "MEDIUM",
                    "explanation": "Citation found in web search with accessible content",
                    "completeness_score": 85 if content else 60
                }
            else:
                return {
                    "citation": citation,
                    "assessment": "No search results found",
                    "risk_level": "HIGH",
                    "explanation": "Citation not found in web search - may be fabricated",
                    "completeness_score": 20
                }
                
        except Exception as e:
            return {
                "citation": citation,
                "assessment": f"Error verifying citation: {str(e)}",
                "risk_level": "MEDIUM",
                "explanation": "Technical error during citation verification",
                "completeness_score": 0
            }
    
    def determine_risk_level(self, confidence_score: float, issues: List[Dict]) -> str:
        """Determine overall risk level based on confidence and issues."""
        has_critical = any(issue.get('risk_level') == 'CRITICAL' for issue in issues)
        has_high = any(issue.get('risk_level') == 'HIGH' for issue in issues)
        has_medium = any(issue.get('risk_level') == 'MEDIUM' for issue in issues)

        if has_critical:
            return "CRITICAL"
        if has_high:
            return "HIGH"
        if has_medium:
            return "MEDIUM" if confidence_score >= 40 else "HIGH"

        if confidence_score >= 85:
            return "LOW"
        if confidence_score >= 60:
            return "MEDIUM"
        if confidence_score >= 30:
            return "HIGH"
        return "CRITICAL"