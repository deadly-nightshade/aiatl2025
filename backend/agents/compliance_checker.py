import google.generativeai as genai
import os
import json
import re
from datetime import datetime
from typing import Dict, List, Optional
import logging
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

class ComplianceCheckerAgent(BaseAgent):
    """Enhanced compliance-checking agent (part of a middleware/tooling system).

    This agent is a checking component intended to be used inside a larger
    middleware or platform used by healthcare organizations. Its sole purpose
    is to analyze AI-generated outputs and IDENTIFY potential HIPAA and
    medical compliance violations (including FDA/regulatory flags). It should
    NOT provide medical advice to patients or act as a clinical decision tool.

    The agent returns structured findings (violations, severity, guidance
    mapping, and suggested remediation steps for engineers/content authors)
    so that downstream systems or human reviewers can take action.
    """
    
    def __init__(self):
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.model_name = os.getenv('GOOGLE_GEMINI_MODEL', 'gemini-pro')
        
        genai.configure(api_key=self.google_api_key)
        self.model = genai.GenerativeModel(self.model_name)
        
        # Load compliance rules and guidelines
        self.hipaa_rules = self.load_hipaa_rules()
        self.medical_guidelines = self.load_medical_guidelines()
        self.medication_database = self.load_medication_database()
        
        logger.info(f"ComplianceCheckerAgent initialized with model: {self.model_name}")
    
    def process_message(self, message: str) -> str:
        """Process compliance checking request."""
        logger.info(f"Processing message: {message[:100]}...")
        return "ComplianceChecker is ready for analysis. Use execute_task for full compliance check."
    
    def execute_task(self, task: str, context: Dict = None) -> Dict:
        """Execute comprehensive compliance check with audit logging."""
        if context is None:
            context = {}
        
        llm_output = context.get('llm_output', '')
        original_prompt = context.get('original_prompt', '')
        
        logger.info(f"Starting compliance check for task: {task}")
        logger.info(f"Output length: {len(llm_output)} chars, Prompt length: {len(original_prompt)} chars")
        
        # Perform compliance analysis
        result = self.check_compliance(llm_output, original_prompt)
        
        # Add audit metadata
        result['audit_metadata'] = {
            'task': task,
            'timestamp': datetime.now().isoformat(),
            'agent_version': '2.0',
            'model_used': self.model_name
        }
        
        logger.info(f"Compliance check completed. Status: {result.get('overall_status')}, Score: {result.get('compliance_score')}")
        
        return {
            "task": task,
            "compliance_analysis": result,
            "status": "completed"
        }
    
    def load_hipaa_rules(self) -> Dict:
        """Load HIPAA compliance rules and guidelines."""
        return {
            "phi_identifiers": [
                "names", "addresses", "dates", "phone_numbers", "fax_numbers",
                "email_addresses", "ssn", "medical_record_numbers", "health_plan_numbers",
                "account_numbers", "certificate_numbers", "vehicle_identifiers",
                "device_identifiers", "web_urls", "ip_addresses", "biometric_identifiers",
                "full_face_photos", "any_unique_identifying_number"
            ],
            "geographic_subdivisions": {
                "allowed": ["state", "first_3_zip_digits"],
                "prohibited": ["street_address", "city", "county", "zip_plus_4"]
            },
            "safe_harbor_method": {
                "remove_identifiers": True,
                "statistical_method": False,
                "age_handling": "ages_over_89_to_single_category"
            },
            "minimum_necessary": {
                "description": "Only minimum necessary PHI should be used/disclosed",
                "applies_to": ["uses", "disclosures", "requests"]
            },
            "authorization_requirements": {
                "written_authorization": True,
                "specific_information": True,
                "expiration_date": True
            }
        }
    
    def load_medical_guidelines(self) -> Dict:
        """Load regulatory compliance guidelines for healthcare provider context."""
        return {
            "controlled_substance_regulations": {
                "required_documentation": [
                    "dea_requirements",
                    "prescription_limitations",
                    "state_specific_regulations"
                ]
            },
            "fda_regulatory": {
                "required_disclosures": [
                    "off_label_use_disclosure",
                    "black_box_warnings",
                    "approval_status"
                ],
                "prohibited": [
                    "unapproved_uses_without_disclosure",
                    "false_efficacy_claims"
                ]
            },
            "dosing_safety_regulations": {
                "must_include_for_high_risk": ["black_box_warning", "contraindications"],
                "must_avoid": ["ambiguous_dosing", "missing_max_dose"]
            },
            "hipaa_specific": {
                "minimum_necessary_rule": True,
                "authorization_requirements": ["uses", "disclosures"],
                "breach_notification_triggers": ["unsecured_phi", "unauthorized_access"]
            }
        }
    
    def load_medication_database(self) -> Dict:
        """Load medication safety database."""
        return {
            "high_risk_medications": [
                "warfarin", "insulin", "opioids", "chemotherapy", "anticoagulants"
            ],
            "common_interactions": {
                "warfarin": ["nsaids", "aspirin", "vitamin_k"],
                "maoi": ["ssri", "tyramine_foods"],
                "statins": ["grapefruit", "fibrates"]
            },
            "controlled_substances": {
                "schedule_ii": ["oxycodone", "fentanyl", "adderall"],
                "schedule_iii": ["codeine", "buprenorphine"],
                "schedule_iv": ["xanax", "ativan", "ambien"]
            }
        }
    
    def check_compliance(self, llm_output: str, original_prompt: str) -> Dict:
        """Comprehensive compliance check with enhanced detection."""
        try:
            # 1. Enhanced PHI detection
            phi_check = self.check_phi_violations_enhanced(llm_output)
            
            # 2. Regulatory compliance checking
            regulatory_check = self.check_regulatory_compliance(llm_output)
            
            # 3. FDA/regulatory appropriateness
            fda_check = self.check_fda_regulatory_compliance(llm_output, original_prompt)
            
            # 4. Critical clinical situation regulatory requirements
            critical_situation_check = self.check_critical_situation_compliance(llm_output, original_prompt)
            
            # 5. Medication safety check
            medication_check = self.check_medication_safety(llm_output)
            
            # 6. Calculate overall compliance score
            compliance_score = self.calculate_compliance_score_enhanced(
                phi_check, regulatory_check, fda_check, 
                critical_situation_check, medication_check
            )
            
            return {
                "phi_violations": phi_check,
                "regulatory_compliance": regulatory_check,
                "fda_compliance": fda_check,
                "critical_situation_compliance": critical_situation_check,
                "medication_safety": medication_check,
                "compliance_score": compliance_score,
                "overall_status": self.determine_compliance_status(compliance_score),
                "recommendations": self.generate_compliance_recommendations_enhanced(
                    phi_check, regulatory_check, fda_check, 
                    critical_situation_check, medication_check
                ),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in compliance check: {str(e)}", exc_info=True)
            return {
                "error": str(e),
                "compliance_score": 0,
                "overall_status": "ERROR",
                "timestamp": datetime.now().isoformat()
            }
    
    def check_phi_violations_enhanced(self, text: str) -> Dict:
        """Enhanced PHI detection with name recognition and geographic granularity."""
        try:
            violations = []

            # Enhanced PHI patterns
            phi_patterns = {
                "phone_numbers": r'\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b',
                "ssn": r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',
                "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                "dates": r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b',
                "medical_record_numbers": r'\b(?:MR|MRN|Medical Record|Patient ID)[:\s#]*\d+\b',
                "addresses": r'\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)(?:\s+(?:Apt|Apartment|Unit|Suite|#)\s*[A-Za-z0-9]+)?\b',
                "zip_codes": r'\b\d{5}(?:-\d{4})?\b',
                "ip_addresses": r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
                "urls": r'https?://[^\s]+',
                "ages_over_89": r'\b(?:age|aged|years old)?\s*(?:9[0-9]|[1-9]\d{2,})\s*(?:years old|y\.?o\.?|yr)?\b'
            }

            for phi_type, pattern in phi_patterns.items():
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    violations.append({
                        "type": phi_type,
                        "count": len(matches),
                        "severity": self._determine_phi_severity(phi_type),
                        "remediation": self._get_phi_remediation(phi_type)
                    })

            # Check for names using AI
            name_check = self._check_for_names(text)
            if name_check.get("names_detected"):
                violations.append({
                    "type": "potential_names",
                    "count": len(name_check.get("potential_names", [])),
                    "severity": "HIGH",
                    "details": name_check,
                    "remediation": "Remove or redact all personal names"
                })

            # Use Gemini for sophisticated PHI detection
            ai_analysis = self._ai_phi_analysis(text)
            
            # Check for quasi-identifier combinations
            quasi_identifier_risk = self._check_quasi_identifiers(text)

            return {
                "pattern_violations": violations,
                "ai_analysis": ai_analysis,
                "quasi_identifier_risk": quasi_identifier_risk,
                "total_violations": len(violations),
                "confidence_score": self._calculate_phi_confidence(violations, ai_analysis),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in PHI detection: {str(e)}", exc_info=True)
            return {"error": str(e), "total_violations": 0}

    def _determine_phi_severity(self, phi_type: str) -> str:
        """Determine severity level for PHI type."""
        high_severity = ["ssn", "medical_record_numbers", "names"]
        medium_severity = ["phone_numbers", "email", "addresses", "dates"]
        
        if phi_type in high_severity:
            return "HIGH"
        elif phi_type in medium_severity:
            return "MEDIUM"
        return "LOW"

    def _get_phi_remediation(self, phi_type: str) -> str:
        """Get specific remediation advice for PHI type."""
        remediations = {
            "ssn": "Remove completely - SSNs are never needed in patient communications",
            "medical_record_numbers": "Remove or replace with generic identifier",
            "phone_numbers": "Remove or provide generic contact number",
            "email": "Remove personal email or use organizational contact",
            "addresses": "Remove specific address or limit to state level",
            "dates": "Remove specific dates or limit to year only (if age < 89)",
            "ages_over_89": "Replace with '90 or older' per HIPAA Safe Harbor",
            "zip_codes": "Use only first 3 digits (unless in low-population area)"
        }
        return remediations.get(phi_type, "Review and remove if not necessary")

    def _check_for_names(self, text: str) -> Dict:
        """Use AI to detect potential names."""
        try:
            prompt = (
                "Analyze the following text and identify any personal names (first names, last names, or full names). "
                "Return ONLY a JSON object with keys: 'names_detected' (boolean), 'potential_names' (list of strings), "
                "'confidence' (LOW/MEDIUM/HIGH). No additional text.\n\n"
                f"TEXT: {text}"
            )
            
            response = self.model.generate_content(prompt)
            result = self._parse_json_response(response)
            
            if result:
                return result
            else:
                return {"names_detected": False, "potential_names": [], "confidence": "LOW"}
                
        except Exception as e:
            logger.error(f"Error in name detection: {str(e)}")
            return {"names_detected": False, "error": str(e)}

    def _ai_phi_analysis(self, text: str) -> Dict:
        """Enhanced AI PHI analysis with validated JSON parsing."""
        try:
            hipaa_json = json.dumps(self.hipaa_rules, indent=2)
            prompt = (
                "Analyze the following text for potential HIPAA Protected Health Information (PHI) "
                "violations and map any findings to the HIPAA guidance provided below.\n\n"
                f"HIPAA_GUIDANCE: {hipaa_json}\n\n"
                f"TEXT: {text}\n\n"
                "Return ONLY valid JSON (no prose, no markdown) with these exact keys:\n"
                "{\n"
                '  "found_phi": [{"type": "...", "match": "...", "severity": "LOW|MEDIUM|HIGH", "guidance_ref": "..."}],\n'
                '  "contextual_reidentification": [{"combination": "...", "risk_level": "..."}],\n'
                '  "overall_risk": "LOW|MEDIUM|HIGH",\n'
                '  "mitigation_steps": ["step1", "step2"],\n'
                '  "confidence": "LOW|MEDIUM|HIGH"\n'
                "}"
            )

            response = self.model.generate_content(prompt)
            parsed_result = self._parse_json_response(response)
            
            if parsed_result:
                return parsed_result
            else:
                logger.warning("AI PHI analysis returned unparseable response")
                return {
                    "found_phi": [],
                    "overall_risk": "UNKNOWN",
                    "error": "Failed to parse AI response"
                }

        except Exception as e:
            logger.error(f"Error in AI PHI analysis: {str(e)}")
            return {"error": str(e), "overall_risk": "UNKNOWN"}

    def _check_quasi_identifiers(self, text: str) -> Dict:
        """Check for combinations of quasi-identifiers."""
        quasi_identifiers_found = []
        
        quasi_patterns = {
            "age": r'\b(?:age|aged|years old)?\s*\d{1,3}\s*(?:years old|y\.?o\.?|yr)?\b',
            "gender": r'\b(?:male|female|man|woman|boy|girl)\b',
            "race_ethnicity": r'\b(?:caucasian|african american|hispanic|asian|native american)\b',
            "occupation": r'\b(?:doctor|nurse|teacher|engineer|manager)\b',
            "zip_3_digit": r'\b\d{3}\b'
        }
        
        for qi_type, pattern in quasi_patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                quasi_identifiers_found.append(qi_type)
        
        risk_level = "LOW"
        if len(quasi_identifiers_found) >= 4:
            risk_level = "HIGH"
        elif len(quasi_identifiers_found) >= 2:
            risk_level = "MEDIUM"
        
        return {
            "quasi_identifiers_present": quasi_identifiers_found,
            "count": len(quasi_identifiers_found),
            "reidentification_risk": risk_level,
            "recommendation": "Consider removing or generalizing quasi-identifiers" if len(quasi_identifiers_found) >= 2 else "Acceptable"
        }

    def _calculate_phi_confidence(self, violations: List, ai_analysis: Dict) -> float:
        """Calculate confidence score for PHI detection."""
        if not violations and not ai_analysis.get("found_phi"):
            return 1.0
        
        if "error" in ai_analysis:
            return 0.6
        
        return 0.9

    def check_regulatory_compliance(self, text: str) -> Dict:
        """Check for regulatory compliance issues (controlled substances, DEA requirements, etc.)."""
        try:
            violations = []
            
            # Check for controlled substance mentions without proper context
            for schedule, substances in self.medication_database["controlled_substances"].items():
                for substance in substances:
                    if re.search(rf'\b{substance}\b', text, re.IGNORECASE):
                        # Check if DEA/prescription requirements are mentioned
                        if not re.search(r'DEA|prescription|controlled|schedule', text, re.IGNORECASE):
                            violations.append({
                                "type": "controlled_substance_without_regulatory_context",
                                "substance": substance,
                                "schedule": schedule,
                                "severity": "HIGH",
                                "regulation": "DEA Controlled Substances Act"
                            })
            
            # Check for state-specific regulatory requirements
            state_specific_keywords = [
                "prescribing limits", "PDMP", "prescription monitoring",
                "state regulations", "licensing requirements"
            ]
            
            regulatory_context_present = any(
                re.search(keyword, text, re.IGNORECASE) 
                for keyword in state_specific_keywords
            )
            
            return {
                "violations": violations,
                "regulatory_context_present": regulatory_context_present,
                "total_violations": len(violations),
                "status": "COMPLIANT" if len(violations) == 0 else "NON_COMPLIANT",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in regulatory compliance check: {str(e)}")
            return {"error": str(e), "status": "ERROR"}

    def check_fda_regulatory_compliance(self, llm_output: str, original_prompt: str) -> Dict:
        """Check for FDA regulatory compliance issues."""
        try:
            guidelines_json = json.dumps(self.medical_guidelines, indent=2)
            prompt = (
                "You are an automated FDA/regulatory compliance reviewer analyzing AI-generated clinical output "
                "for healthcare providers. Focus ONLY on regulatory violations:\n"
                "- Off-label drug uses mentioned without disclosure\n"
                "- Missing FDA black box warnings for high-risk medications\n"
                "- Unapproved drug uses presented as approved\n"
                "- Missing approval status disclosures\n"
                "- False or misleading efficacy claims\n\n"
                f"REGULATORY_GUIDELINES: {guidelines_json}\n\n"
                f"PROVIDER_QUERY: {original_prompt}\n\n"
                f"AI_OUTPUT: {llm_output}\n\n"
                "Return ONLY valid JSON (no markdown, no prose) with these exact keys:\n"
                "{\n"
                '  "violations": [{"id": "...", "type": "...", "description": "...", "severity": "LOW|MEDIUM|HIGH", "regulation": "..."}],\n'
                '  "off_label_uses_without_disclosure": ["use1", "use2"],\n'
                '  "missing_black_box_warnings": ["medication1", "medication2"],\n'
                '  "approval_status_issues": ["issue1", "issue2"],\n'
                '  "false_efficacy_claims": ["claim1", "claim2"],\n'
                '  "recommended_remediations": ["action1", "action2"],\n'
                '  "overall_risk_level": "LOW|MEDIUM|HIGH"\n'
                "}"
            )

            response = self.model.generate_content(prompt)
            parsed_result = self._parse_json_response(response)
            
            if parsed_result:
                return {
                    "fda_analysis": parsed_result,
                    "parse_successful": True,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                logger.warning("Failed to parse FDA regulatory compliance response")
                return {
                    "fda_analysis": {"error": "Parse failed"},
                    "parse_successful": False,
                    "timestamp": datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Error in FDA compliance check: {str(e)}")
            return {"error": str(e), "parse_successful": False}

    def check_critical_situation_compliance(self, llm_output: str, original_prompt: str) -> Dict:
        """Check if critical situations have required regulatory warnings/documentation."""
        try:
            # Focus on regulatory requirements for critical medications/situations
            critical_regulatory_keywords = {
                "black_box_warning_required": [
                    "warfarin", "dabigatran", "rivaroxaban", "apixaban",  # anticoagulants
                    "clozapine", "olanzapine",  # antipsychotics with metabolic risks
                    "isotretinoin",  # teratogenic
                    "fluoroquinolone", "levofloxacin", "ciprofloxacin"  # tendon/nerve risks
                ],
                "rems_program_required": [
                    "isotretinoin", "thalidomide", "clozapine",
                    "fentanyl", "extended-release opioids"
                ]
            }
            
            detected_medications = []
            missing_warnings = []
            
            combined_text = llm_output.lower()
            
            # Check for black box warning medications
            for med in critical_regulatory_keywords["black_box_warning_required"]:
                if med in combined_text:
                    detected_medications.append({"medication": med, "requirement": "black_box_warning"})
                    # Check if warning is present
                    if not re.search(r'black[- ]?box|boxed warning|serious.*risk|warning.*serious', llm_output, re.IGNORECASE):
                        missing_warnings.append({
                            "medication": med,
                            "missing_requirement": "FDA Black Box Warning",
                            "severity": "HIGH"
                        })
            
            # Check for REMS program medications
            for med in critical_regulatory_keywords["rems_program_required"]:
                if med in combined_text:
                    detected_medications.append({"medication": med, "requirement": "REMS_program"})
                    if not re.search(r'REMS|Risk Evaluation|Mitigation Strategy', llm_output, re.IGNORECASE):
                        missing_warnings.append({
                            "medication": med,
                            "missing_requirement": "REMS Program Disclosure",
                            "severity": "HIGH"
                        })
            
            critical_detected = len(detected_medications) > 0
            
            if critical_detected:
                return {
                    "critical_medications_detected": True,
                    "detected_medications": detected_medications,
                    "missing_warnings": missing_warnings,
                    "status": "COMPLIANT" if len(missing_warnings) == 0 else "VIOLATION",
                    "recommendation": "Ensure all FDA-mandated warnings and REMS requirements are included"
                }
            else:
                return {
                    "critical_medications_detected": False,
                    "status": "NOT_APPLICABLE"
                }
                
        except Exception as e:
            logger.error(f"Error in critical situation compliance check: {str(e)}")
            return {"error": str(e), "status": "ERROR"}

    def check_medication_safety(self, text: str) -> Dict:
        """Check for medication safety issues."""
        try:
            issues = []
            
            for med in self.medication_database["high_risk_medications"]:
                if re.search(rf'\b{med}\b', text, re.IGNORECASE):
                    if not re.search(r'monitor|caution|warning|consult|doctor', text, re.IGNORECASE):
                        issues.append({
                            "type": "high_risk_medication_without_warning",
                            "medication": med,
                            "severity": "HIGH",
                            "recommendation": f"Include safety warnings and monitoring requirements for {med}"
                        })
            
            for schedule, substances in self.medication_database["controlled_substances"].items():
                for substance in substances:
                    if re.search(rf'\b{substance}\b', text, re.IGNORECASE):
                        issues.append({
                            "type": "controlled_substance_mentioned",
                            "substance": substance,
                            "schedule": schedule,
                            "severity": "MEDIUM",
                            "recommendation": f"Ensure proper context and warnings for {schedule} substance"
                        })
            
            dosing_pattern = r'\b\d+\s*(?:mg|mcg|g|ml|units?)\b'
            if re.search(dosing_pattern, text, re.IGNORECASE):
                if not re.search(r'prescribed by|as directed by|consult.*doctor|healthcare provider', text, re.IGNORECASE):
                    issues.append({
                        "type": "specific_dosing_without_context",
                        "severity": "HIGH",
                        "recommendation": "Never provide specific doses without emphasizing need for physician consultation"
                    })
            
            return {
                "issues_found": issues,
                "total_issues": len(issues),
                "status": "VIOLATION" if issues else "COMPLIANT",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in medication safety check: {str(e)}")
            return {"error": str(e), "status": "ERROR"}

    def _parse_json_response(self, response) -> Optional[Dict]:
        """Safely parse JSON from AI response."""
        try:
            text = getattr(response, 'text', getattr(response, 'output_text', str(response)))
            text = re.sub(r'```json\s*', '', text)
            text = re.sub(r'```\s*', '', text)
            
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            else:
                logger.warning("No JSON object found in response")
                return None
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error parsing JSON response: {str(e)}")
            return None
    
    def calculate_compliance_score_enhanced(self, phi_check: Dict, regulatory_check: Dict, 
                                          fda_check: Dict, critical_situation_check: Dict,
                                          medication_check: Dict) -> float:
        """Enhanced compliance score calculation focused on regulatory issues."""
        try:
            score = 100.0
            
            # PHI violations (critical regulatory issue - up to 50 points)
            phi_violations = phi_check.get("total_violations", 0)
            phi_confidence = phi_check.get("confidence_score", 1.0)
            score -= min(50, phi_violations * 15 * phi_confidence)
            
            # Quasi-identifier risk (HIPAA compliance)
            quasi_risk = phi_check.get("quasi_identifier_risk", {}).get("reidentification_risk", "LOW")
            if quasi_risk == "HIGH":
                score -= 20
            elif quasi_risk == "MEDIUM":
                score -= 10
            
            # Regulatory violations (DEA, controlled substances)
            reg_violations = regulatory_check.get("total_violations", 0)
            score -= min(25, reg_violations * 10)
            
            # FDA violations (black box warnings, off-label disclosure)
            fda_analysis = fda_check.get("fda_analysis", {})
            if isinstance(fda_analysis, dict) and "violations" in fda_analysis:
                violations = fda_analysis.get("violations", [])
                for violation in violations:
                    severity = violation.get("severity", "LOW")
                    if severity == "HIGH":
                        score -= 10
                    elif severity == "MEDIUM":
                        score -= 5
                    else:
                        score -= 2
            
            # Critical medication warnings missing (FDA mandate)
            if critical_situation_check.get("status") == "VIOLATION":
                missing_warnings = critical_situation_check.get("missing_warnings", [])
                for warning in missing_warnings:
                    if warning.get("severity") == "HIGH":
                        score -= 15
            
            # Medication safety regulatory issues
            med_issues = medication_check.get("issues_found", [])
            for issue in med_issues:
                severity = issue.get("severity", "LOW")
                if severity == "HIGH":
                    score -= 8
                elif severity == "MEDIUM":
                    score -= 4
                else:
                    score -= 2
            
            return max(0.0, min(100.0, score))
            
        except Exception as e:
            logger.error(f"Error calculating compliance score: {str(e)}")
            return 0.0
    
    def determine_compliance_status(self, score: float) -> str:
        """Determine overall compliance status based on score."""
        if score >= 95:
            return "FULLY_COMPLIANT"
        elif score >= 80:
            return "MOSTLY_COMPLIANT"
        elif score >= 60:
            return "PARTIALLY_COMPLIANT"
        elif score >= 40:
            return "MARGINALLY_COMPLIANT"
        else:
            return "NON_COMPLIANT"
    
    def generate_compliance_recommendations_enhanced(self, phi_check: Dict, regulatory_check: Dict, 
                                                    fda_check: Dict, critical_situation_check: Dict,
                                                    medication_check: Dict) -> List[Dict]:
        """Generate prioritized, actionable regulatory compliance recommendations."""
        recommendations = []
        priority_counter = 1
        
        # Critical: PHI violations (HIPAA)
        phi_violations = phi_check.get("pattern_violations", [])
        if phi_violations:
            for violation in phi_violations:
                recommendations.append({
                    "priority": priority_counter,
                    "severity": violation.get("severity", "HIGH"),
                    "category": "HIPAA_PHI_VIOLATION",
                    "issue": f"{violation['type']}: {violation['count']} instance(s) found",
                    "action": violation.get("remediation", "Remove or redact PHI"),
                    "regulation_reference": "HIPAA Privacy Rule 45 CFR § 164.514"
                })
                priority_counter += 1
        
        # Quasi-identifier risks (HIPAA)
        quasi_risk = phi_check.get("quasi_identifier_risk", {})
        if quasi_risk.get("reidentification_risk") in ["MEDIUM", "HIGH"]:
            recommendations.append({
                "priority": priority_counter,
                "severity": quasi_risk.get("reidentification_risk"),
                "category": "HIPAA_REIDENTIFICATION_RISK",
                "issue": f"Combination of quasi-identifiers detected: {', '.join(quasi_risk.get('quasi_identifiers_present', []))}",
                "action": quasi_risk.get("recommendation", "Generalize or remove quasi-identifiers"),
                "regulation_reference": "HIPAA Safe Harbor Method 45 CFR § 164.514(b)(2)"
            })
            priority_counter += 1
        
        # Controlled substance regulatory violations (DEA)
        reg_violations = regulatory_check.get("violations", [])
        for violation in reg_violations:
            recommendations.append({
                "priority": priority_counter,
                "severity": violation.get("severity", "HIGH"),
                "category": "DEA_CONTROLLED_SUBSTANCE",
                "issue": f"Controlled substance ({violation.get('substance')}) mentioned without regulatory context",
                "action": f"Include DEA schedule classification and prescribing requirements for {violation.get('schedule')} substances",
                "regulation_reference": violation.get("regulation", "DEA Controlled Substances Act")
            })
            priority_counter += 1
        
        # FDA violations (black box warnings, REMS)
        if critical_situation_check.get("status") == "VIOLATION":
            missing_warnings = critical_situation_check.get("missing_warnings", [])
            for warning in missing_warnings:
                recommendations.append({
                    "priority": priority_counter,
                    "severity": warning.get("severity", "HIGH"),
                    "category": "FDA_MANDATORY_WARNING",
                    "issue": f"Missing {warning.get('missing_requirement')} for {warning.get('medication')}",
                    "action": f"Include FDA-mandated {warning.get('missing_requirement')}",
                    "regulation_reference": "FDA Black Box Warning Requirements / REMS Program"
                })
                priority_counter += 1
        
        # FDA off-label and approval status issues
        fda_analysis = fda_check.get("fda_analysis", {})
        if isinstance(fda_analysis, dict):
            # Off-label uses without disclosure
            off_label = fda_analysis.get("off_label_uses_without_disclosure", [])
            if off_label:
                recommendations.append({
                    "priority": priority_counter,
                    "severity": "HIGH",
                    "category": "FDA_OFF_LABEL_DISCLOSURE",
                    "issue": f"Off-label uses mentioned without disclosure: {', '.join(off_label[:3])}",
                    "action": "Clearly disclose off-label status for any non-FDA-approved uses",
                    "regulation_reference": "FDA Off-Label Use Requirements"
                })
                priority_counter += 1
            
            # Missing black box warnings
            missing_bb = fda_analysis.get("missing_black_box_warnings", [])
            if missing_bb:
                recommendations.append({
                    "priority": priority_counter,
                    "severity": "HIGH",
                    "category": "FDA_BLACK_BOX_WARNING",
                    "issue": f"Missing black box warnings for: {', '.join(missing_bb[:3])}",
                    "action": "Include all FDA-mandated black box warnings",
                    "regulation_reference": "21 CFR § 201.57(c)(1)"
                })
                priority_counter += 1
        
        # Medication safety regulatory issues
        med_issues = medication_check.get("issues_found", [])
        for issue in med_issues:
            if issue.get("severity") in ["HIGH", "MEDIUM"]:
                recommendations.append({
                    "priority": priority_counter,
                    "severity": issue.get("severity"),
                    "category": "MEDICATION_REGULATORY_SAFETY",
                    "issue": issue.get("type", "Medication regulatory concern"),
                    "action": issue.get("recommendation", "Add appropriate regulatory context"),
                    "regulation_reference": "FDA Drug Safety Guidelines"
                })
                priority_counter += 1
        
        # General best practices
        if not recommendations:
            recommendations.append({
                "priority": 1,
                "severity": "INFO",
                "category": "REGULATORY_COMPLIANCE",
                "issue": "No critical regulatory violations detected",
                "action": "Continue following HIPAA, FDA, and DEA compliance requirements",
                "regulation_reference": "General Compliance Standards"
            })
        
        # Sort by severity and priority
        return sorted(recommendations, key=lambda x: (
            {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}.get(x["severity"], 5),
            x["priority"]
        ))
    
    def _get_disclaimer_text(self, disclaimer_type: str) -> str:
        """Get recommended regulatory compliance guidance."""
        regulatory_guidance = {
            "controlled_substance": "Include DEA schedule and prescribing restrictions",
            "fda_warning": "Include all FDA-mandated warnings and black box information",
            "off_label_use": "Clearly disclose off-label status and lack of FDA approval for this use"
        }
        return regulatory_guidance.get(disclaimer_type, "Consult regulatory compliance guidelines")
    
    def _get_clinical_standard_guidance(self, standard_type: str) -> str:
        """Get specific guidance for regulatory compliance."""
        guidance = {
            "controlled_substance": "Document DEA schedule, state-specific requirements, and PDMP consultation",
            "fda_warning": "Include mandatory FDA warnings, black box disclosures, and REMS requirements",
            "off_label_use": "Disclose non-FDA-approved status and cite supporting evidence"
        }
        return guidance.get(standard_type, "Follow federal and state regulatory requirements")
    
    def generate_compliance_report(self, compliance_result: Dict) -> str:
        """Generate a human-readable compliance report."""
        try:
            report_lines = [
                "=" * 80,
                "COMPLIANCE ANALYSIS REPORT",
                "=" * 80,
                f"Generated: {compliance_result.get('timestamp', 'N/A')}",
                f"Overall Status: {compliance_result.get('overall_status', 'UNKNOWN')}",
                f"Compliance Score: {compliance_result.get('compliance_score', 0):.1f}/100",
                "",
                "SUMMARY",
                "-" * 80,
            ]
            
            phi_check = compliance_result.get('phi_violations', {})
            phi_violations = phi_check.get('total_violations', 0)
            report_lines.append(f"HIPAA PHI Violations: {phi_violations}")
            
            regulatory_check = compliance_result.get('regulatory_compliance', {})
            reg_violations = regulatory_check.get('total_violations', 0)
            report_lines.append(f"DEA/Regulatory Violations: {reg_violations}")
            
            critical_check = compliance_result.get('critical_situation_compliance', {})
            report_lines.append(f"FDA Mandatory Warnings: {critical_check.get('status', 'N/A')}")
            
            med_check = compliance_result.get('medication_safety', {})
            med_issues = med_check.get('total_issues', 0)
            report_lines.append(f"Medication Regulatory Issues: {med_issues}")
            
            report_lines.extend([
                "",
                "TOP PRIORITY ACTIONS",
                "-" * 80
            ])
            
            recommendations = compliance_result.get('recommendations', [])[:10]
            for i, rec in enumerate(recommendations, 1):
                report_lines.append(f"{i}. [{rec['severity']}] {rec['issue']}")
                report_lines.append(f"   Action: {rec['action']}")
                report_lines.append("")
            
            report_lines.append("=" * 80)
            
            return "\n".join(report_lines)
            
        except Exception as e:
            logger.error(f"Error generating compliance report: {str(e)}")
            return f"Error generating report: {str(e)}"