import os
from smolagents import LiteLLMModel, ToolCallingAgent
from flask import Flask, request, jsonify
import uuid
from datetime import datetime

# Define the nutrition expert system prompt
NUTRITION_EXPERT_PROMPT = """You are Dr. FitBot, a friendly, highly knowledgeable fitness and health coach with deep expertise in both exercise training and nutritional science.

Your combined expertise includes:
- Strength training and weightlifting programming (progressive overload, periodization, rep ranges, set schemes, tempo, exercise selection)
- Calisthenics and bodyweight training (skill progressions, scaling, regressions, mobility and movement quality)
- Sports nutrition and performance optimization for training, recovery, and competition
- Macronutrient and micronutrient analysis and meal planning
- Timing of nutrition around training, hydration, and supplementation where appropriate
- Dietary recommendations for various goals (fat loss, muscle gain, strength, endurance) and populations
- Food allergies, intolerances, and dietary patterns (vegan, vegetarian, keto, Mediterranean, etc.)
- Injury prevention, recovery strategies, and safe exercise modification
- Practical coaching: habit formation, adherence strategies, and realistic goal setting

When answering questions:
- Follow given format guidelines
- Be informative
- Provide evidence-based guidance while noting uncertainties
- Ask clarifying questions when needed to tailor recommendations (e.g., current training status, equipment, injuries, schedule)
- Offer scalable options (beginner → intermediate → advanced) and clear progressions/regressions
- Emphasize safety, recovery, and sustainable behavior change
- Clarify that your responses are educational and not a substitute for personalized medical care when appropriate

Always maintain your role as a combined fitness coach and nutrition expert throughout the conversation."""


class NutritionExpertAgent:
    """A smolagents agent that acts as a nutrition expert using OpenRouter's Grok model."""
    
    def __init__(self, api_key=None):
        """Initialize the nutrition expert agent.
        
        Args:
            api_key: OpenRouter API key. If None, pulls from environment.
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not found in environment variables")
        
        # Initialize the LiteLLM model with OpenRouter
        self.model = LiteLLMModel(
            model_id="openrouter/x-ai/grok-4.1-fast",
            api_key=self.api_key,
            api_base="https://openrouter.ai/api/v1"
        )
        
        # Create the agent with minimal parameters
        self.agent = ToolCallingAgent(
            tools=[],  # Add tools here if needed (e.g., web search, calculator)
            model=self.model
        )
        
        # Store the system prompt to prepend to messages
        self.system_prompt = NUTRITION_EXPERT_PROMPT
        self.conversation_history = []
    
    def chat(self, message):
        """Send a message to the nutrition expert agent.
        
        Args:
            message: User message string
            
        Returns:
            Agent's response string
        """
        # Prepend the system prompt to the user message for context
        full_message = f"{self.system_prompt}\n\nUser: {message}"
        response = self.agent.run(full_message)
        return response
    
    def reset(self):
        """Reset the conversation history."""
        self.conversation_history = []
        self.agent = ToolCallingAgent(
            tools=[],
            model=self.model
        )


def create_api_server(agent):
    """Create a Flask server that hosts the agent as an OpenAI-compatible API.
    
    Args:
        agent: NutritionExpertAgent instance
        
    Returns:
        Flask app instance
    """
    app = Flask(__name__)
    
    @app.route('/v1/chat/completions', methods=['POST'])
    def chat_completions():
        """OpenAI-compatible chat completions endpoint."""
        try:
            data = request.json
            messages = data.get('messages', [])
            
            if not messages:
                return jsonify({'error': 'No messages provided'}), 400
            
            # Get the last user message
            user_message = None
            for msg in reversed(messages):
                if msg.get('role') == 'user':
                    user_message = msg.get('content')
                    break
            
            if not user_message:
                return jsonify({'error': 'No user message found'}), 400
            
            # Get response from agent
            response_text = agent.chat(user_message)
            
            # Format response in OpenAI style
            response = {
                'id': f'chatcmpl-{uuid.uuid4().hex[:8]}',
                'object': 'chat.completion',
                'created': int(datetime.now().timestamp()),
                'model': 'nutrition-expert-grok',
                'choices': [{
                    'index': 0,
                    'message': {
                        'role': 'assistant',
                        'content': str(response_text)
                    },
                    'finish_reason': 'stop'
                }],
                'usage': {
                    'prompt_tokens': 0,
                    'completion_tokens': 0,
                    'total_tokens': 0
                }
            }
            
            return jsonify(response)
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/v1/models', methods=['GET'])
    def list_models():
        """List available models endpoint."""
        return jsonify({
            'object': 'list',
            'data': [{
                'id': 'nutrition-expert-grok',
                'object': 'model',
                'created': int(datetime.now().timestamp()),
                'owned_by': 'nutrition-expert'
            }]
        })
    
    @app.route('/health', methods=['GET'])
    def health():
        """Health check endpoint."""
        return jsonify({'status': 'healthy'})
    
    return app


def main():
    """Main function to run the agent in different modes."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Nutrition Expert Agent')
    parser.add_argument('--serve', action='store_true', 
                       help='Host the agent as an OpenAI-compatible API')
    parser.add_argument('--host', default='0.0.0.0', 
                       help='Host for API server (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8000, 
                       help='Port for API server (default: 8000)')
    
    args = parser.parse_args()
    
    # Initialize the agent
    agent = NutritionExpertAgent()
    
    if args.serve:
        # Start API server
        print(f"🥗 Starting Nutrition Expert API server on {args.host}:{args.port}")
        print(f"📍 Endpoint: http://{args.host}:{args.port}/v1/chat/completions")
        app = create_api_server(agent)
        app.run(host=args.host, port=args.port)
    else:
        # Interactive CLI mode
        print("🥗 Nutrition Expert Agent (powered by Grok)")
        print("Type 'exit' or 'quit' to end the conversation")
        print("Type 'reset' to start a new conversation\n")
        
        while True:
            try:
                user_input = input("You: ").strip()
                
                if user_input.lower() in ['exit', 'quit']:
                    print("👋 Goodbye! Stay healthy!")
                    break
                
                if user_input.lower() == 'reset':
                    agent.reset()
                    print("🔄 Conversation reset!\n")
                    continue
                
                if not user_input:
                    continue
                
                response = agent.chat(user_input)
                print(f"\n🥗 Dr. NutriBot: {response}\n")
                
            except KeyboardInterrupt:
                print("\n👋 Goodbye! Stay healthy!")
                break
            except Exception as e:
                print(f"❌ Error: {e}\n")


if __name__ == "__main__":
    main()
