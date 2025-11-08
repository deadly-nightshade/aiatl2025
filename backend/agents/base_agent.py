from abc import ABC, abstractmethod
from typing import Dict, List

class BaseAgent(ABC):
    """Abstract base class for all agents."""
    
    @abstractmethod
    def process_message(self, message: str) -> str:
        """Process a message and return a response."""
        pass
    
    @abstractmethod
    def execute_task(self, task: str, context: Dict = None) -> Dict:
        """Execute a task with optional context."""
        pass

class AgentManager:
    """Manages multiple agents and routes requests appropriately."""
    
    def __init__(self):
        self.agents = {}
        self.default_agent = None
    
    def register_agent(self, name: str, agent: BaseAgent, is_default: bool = False):
        """Register an agent with the manager."""
        self.agents[name] = agent
        if is_default:
            self.default_agent = name
    
    def get_agent(self, name: str = None) -> BaseAgent:
        """Get a specific agent or the default agent."""
        if name is None:
            name = self.default_agent
        return self.agents.get(name)
    
    def list_agents(self) -> List[str]:
        """List all registered agents."""
        return list(self.agents.keys())