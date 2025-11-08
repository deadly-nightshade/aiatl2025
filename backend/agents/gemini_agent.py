import google.generativeai as genai
import os
from typing import Dict, List
import json
import logging
from .base_agent import BaseAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiAgent(BaseAgent):
    def __init__(self):
        """Initialize the Gemini agent with API configuration."""
        self.api_key = os.getenv('GOOGLE_API_KEY')
        self.model_name = os.getenv('GOOGLE_GEMINI_MODEL', 'gemini-pro')  # Default to gemini-pro if not set
        
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)
        
        # Agent configuration
        self.system_prompt = """
        You are an intelligent AI agent with the following capabilities:
        - Analyze and understand user requests
        - Break down complex tasks into actionable steps
        - Provide detailed and helpful responses
        - Execute various types of tasks based on user input
        
        Always respond in a helpful, clear, and structured manner.
        """
        
        self.conversation_history = []
    
    def process_message(self, message: str) -> str:
        """Process a single message through the Gemini model."""
        try:
            # Add system context to the message
            full_prompt = f"{self.system_prompt}\n\nUser: {message}\n\nAssistant:"
            
            response = self.model.generate_content(full_prompt)
            
            # Store conversation history
            self.conversation_history.append({
                "user": message,
                "assistant": response.text
            })
            
            logger.info(f"Processed message: {message[:50]}...")
            return response.text
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return f"Sorry, I encountered an error: {str(e)}"
    
    def execute_task(self, task: str, context: Dict = None) -> Dict:
        """Execute a specific task with optional context."""
        try:
            if context is None:
                context = {}
            
            # Create task-specific prompt
            task_prompt = f"""
            {self.system_prompt}
            
            Task: {task}
            Context: {json.dumps(context, indent=2)}
            
            Please analyze this task and provide:
            1. Task understanding
            2. Steps to complete the task
            3. Expected outcome
            4. Any recommendations
            
            Format your response as a structured analysis.
            """
            
            response = self.model.generate_content(task_prompt)
            
            # Parse and structure the response
            result = {
                "task": task,
                "analysis": response.text,
                "context_used": context,
                "status": "completed"
            }
            
            logger.info(f"Executed task: {task[:50]}...")
            return result
            
        except Exception as e:
            logger.error(f"Error executing task: {str(e)}")
            return {
                "task": task,
                "error": str(e),
                "status": "failed"
            }
    
    def get_conversation_history(self) -> List[Dict]:
        """Get the conversation history."""
        return self.conversation_history
    
    def clear_history(self):
        """Clear the conversation history."""
        self.conversation_history = []
        logger.info("Conversation history cleared")
    
    def set_system_prompt(self, new_prompt: str):
        """Update the system prompt."""
        self.system_prompt = new_prompt
        logger.info("System prompt updated")