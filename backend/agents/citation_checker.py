import google.generativeai as genai
import requests
from pymed import PubMed
from googleapiclient.discovery import build
import json
import re
import os
from datetime import datetime
from typing import Dict, List, Optional
import logging
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

class CitationCheckerAgent(BaseAgent):
    """Agent that verifies citations against actual sources using PubMed and Google Search."""
    
    def __init__(self):
        self.pubmed = PubMed(tool="CitationChecker", email="your-email@example.com")
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.google_search_api_key = os.getenv('GOOGLE_SEARCH_API_KEY')  # Google Search API key
        self.model_name = os.getenv('GOOGLE_GEMINI_MODEL', 'gemini-pro')  # Default to gemini-pro if not set
        
        genai.configure(api_key=self.google_api_key)
        self.model = genai.GenerativeModel(self.model_name)
    
    def process_message(self, message: str) -> str:
        """Process citation checking request."""
        return self.check_citation(message)
    
    def execute_task(self, task: str, context: Dict = None) -> Dict:
        """Execute citation verification task."""
        if context is None:
            context = {}
        
        citation = context.get('citation', '')
        claim = context.get('claim', '')
        
        result = self.verify_citation_supports_claim(citation, claim)
        
        return {
            "task": task,
            "citation": citation,
            "claim": claim,
            "verification_result": result,
            "status": "completed"
        }
    
    def check_citation(self, citation: str) -> str:
        """Check if a citation exists and is legitimate."""
        try:
            # Extract potential identifiers from citation
            pmid_match = re.search(r'PMID[:\s]*(\d+)', citation)
            doi_match = re.search(r'doi[:\s]*([^\s]+)', citation, re.IGNORECASE)
            
            if pmid_match:
                pmid = pmid_match.group(1)
                return self.verify_pubmed_citation(pmid)
            elif doi_match:
                doi = doi_match.group(1)
                return self.verify_doi_citation(doi)
            else:
                # Try general search
                return self.search_citation_general(citation)
                
        except Exception as e:
            logger.error(f"Error checking citation: {str(e)}")
            return f"Error verifying citation: {str(e)}"
    
    def verify_pubmed_citation(self, pmid: str) -> str:
        """Verify citation using PubMed ID."""
        try:
            query = f"{pmid}[PMID]"
            results = self.pubmed.query(query, max_results=1)
            articles = list(results)
            
            if articles:
                article = articles[0]
                return f"✓ Valid PubMed citation found: {article.title}"
            else:
                return "✗ Invalid PMID - article not found in PubMed"
                
        except Exception as e:
            return f"✗ Error verifying PMID: {str(e)}"
    
    def verify_doi_citation(self, doi: str) -> str:
        """Verify citation using DOI."""
        try:
            # Clean DOI
            doi = doi.strip('.')
            url = f"https://doi.org/{doi}"
            
            response = requests.head(url, timeout=10)
            if response.status_code == 200:
                return f"✓ Valid DOI found: {doi}"
            else:
                return f"✗ Invalid DOI - returns status {response.status_code}"
                
        except Exception as e:
            return f"✗ Error verifying DOI: {str(e)}"
    
    def search_citation_general(self, citation: str) -> str:
        """Search for citation using Google Search API."""
        try:
            if not self.google_search_api_key:
                return "Google Search API not configured"
            
            # Use Google Search API directly via requests
            search_url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': self.google_search_api_key,
                'cx': 'search',  # Use general web search
                'q': citation,
                'num': 3
            }
            
            response = requests.get(search_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'items' in data and data['items']:
                    return f"✓ Found {len(data['items'])} potential matches in web search"
                else:
                    return "✗ No matches found in web search"
            else:
                # Fallback to simple web search verification
                return self.simple_web_search(citation)
                
        except Exception as e:
            return f"✗ Error in general search: {str(e)}"
    
    def simple_web_search(self, citation: str) -> str:
        """Simple fallback search method."""
        try:
            # Extract author and year for basic verification
            author_match = re.search(r'([A-Za-z]+)', citation)
            year_match = re.search(r'(20\d{2})', citation)
            
            if author_match and year_match:
                return f"✓ Citation format appears valid (Author: {author_match.group(1)}, Year: {year_match.group(1)})"
            else:
                return "⚠ Citation format unclear - manual verification recommended"
                
        except Exception as e:
            return f"✗ Error in fallback search: {str(e)}"
    
    def verify_citation_supports_claim(self, citation: str, claim: str) -> Dict:
        """Verify if a citation actually supports the given claim."""
        try:
            # First verify the citation exists
            citation_validity = self.check_citation(citation)
            
            # Use Gemini to analyze if citation supports claim
            prompt = f"""
            Analyze whether the following citation supports the given claim:
            
            Citation: {citation}
            Claim: {claim}
            
            Citation validity check result: {citation_validity}
            
            Please provide:
            1. Does the citation appear to be valid?
            2. Based on the citation information, does it likely support the claim?
            3. Confidence level (Low/Medium/High)
            4. Explanation
            
            Format as JSON.
            """
            
            response = self.model.generate_content(prompt)
            
            return {
                "citation_validity": citation_validity,
                "support_analysis": response.text,
                "timestamp": str(datetime.now())
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "citation_validity": "Error",
                "support_analysis": "Could not analyze support"
            }