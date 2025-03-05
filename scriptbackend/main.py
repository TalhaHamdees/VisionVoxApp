from fastapi import FastAPI, HTTPException, Form
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
import os
import traceback
import re
import random
import json
from typing import Optional, List

from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

try:
    from groq import Groq
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment variables")
    client = Groq(api_key=GROQ_API_KEY)
except ImportError:
    raise ImportError(
        "Groq module not found. Ensure it is installed (pip install groq) and correctly imported."
    )

# Utility function to count words
def count_words(text: str) -> int:
    return len(text.split())

# Utility function to generate a session ID
def generate_session_id(text: str) -> str:
    return f"session_{abs(hash(text))}"

# Load and process example scripts
def load_example_scripts():
    try:
        with open("scripts.txt", "r", encoding="utf-8") as file:
            content = file.read()
            # Split scripts by separator
            scripts = content.split("---")
            # Clean and format scripts
            formatted_scripts = [script.strip() for script in scripts if script.strip()]
            print(f"Loaded {len(formatted_scripts)} example scripts")
            return formatted_scripts
    except FileNotFoundError:
        print("Warning: scripts.txt not found!")
        return []
    except Exception as e:
        print(f"Error loading scripts: {e}")
        return []

# Load example scripts
example_scripts = load_example_scripts()

# Create a few-shot learning prompt
def create_few_shot_prompt(query: str) -> list:
    # Select 2 random examples if available
    selected_examples = random.sample(example_scripts, min(2, len(example_scripts))) if example_scripts else []
    
    system_content = """You are a professional scriptwriter. Generate a script following these rules:
1. Write exactly between 190-220 words
2. Use clear, direct language
3. Focus on storytelling and engagement
4. Maintain consistent tone and style with the examples
5. Structure in a narrative format
6. Include natural transitions between ideas
7. IMPORTANT: Return ONLY the script content without any additional messages, explanations, or markdown formatting
8. Format your response as a JSON object with a single key "script_content" containing the script text
9. Make sure to properly escape all quotes and special characters in your JSON response"""

    messages = [{"role": "system", "content": system_content}]
    
    # Add examples if available
    for example in selected_examples:
        messages.extend([
            {"role": "user", "content": "Write a professional script."},
            {"role": "assistant", "content": json.dumps({"script_content": example})}
        ])
    
    # Add the actual query
    messages.append({
        "role": "user", 
        "content": f"Write a professional script about: {query}. Return ONLY the script content as JSON with the key 'script_content'. Make sure to properly escape all quotes and special characters."
    })
    
    return messages

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Script generation service is running"}

class ChatRequest(BaseModel):
    user_query: str

class ChatResponse(BaseModel):
    response: str

# In-memory storage for scripts
previous_scripts = {}

@app.get("/")
async def read_root():
    return {"message": "Script generation service is running"}

@app.post("/chat", response_model=dict)
async def chat(request: ChatRequest):
    try:
        messages = create_few_shot_prompt(request.user_query)
        
        try:
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
                max_tokens=400,
                top_p=0.9,
                stream=False,
                response_format={"type": "json_object"}
            )

            response_content_raw = completion.choices[0].message.content.strip()
            
            # Parse the JSON response
            try:
                response_json = json.loads(response_content_raw)
                response_content = response_json.get("script_content", "")
            except json.JSONDecodeError:
                # Fallback: If JSON parsing fails, extract content between code blocks
                pattern = r'```(?:json)?\s*\{.*?"script_content"\s*:\s*"(.*?)"\s*\}?\s*```'
                match = re.search(pattern, response_content_raw, re.DOTALL)
                if match:
                    response_content = match.group(1).replace('\\n', '\n').replace('\\"', '"')
                else:
                    # If all else fails, try to extract just the text content without JSON structure
                    # Remove any JSON formatting and just get the text
                    clean_pattern = r'"script_content"\s*:\s*"(.*?)"[,\}]'
                    clean_match = re.search(clean_pattern, response_content_raw, re.DOTALL)
                    if clean_match:
                        response_content = clean_match.group(1).replace('\\n', '\n').replace('\\"', '"')
                    else:
                        # Last resort: just use the raw content
                        response_content = response_content_raw
        except Exception as api_error:
            # If the API call fails, try with a simpler approach without JSON formatting
            print(f"API error: {api_error}")
            
            # Create a simpler prompt without JSON requirement
            simple_messages = [
                {"role": "system", "content": "You are a professional scriptwriter. Write a script between 190-220 words. Use clear language and focus on storytelling."},
                {"role": "user", "content": f"Write a professional script about: {request.user_query}. Write ONLY the script content without any additional text."}
            ]
            
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=simple_messages,
                temperature=0.7,
                max_tokens=400,
                top_p=0.9,
                stream=False
            )
            
            response_content = completion.choices[0].message.content.strip()

        word_count = count_words(response_content)

        # If word count is off, try one refinement
        if not (190 <= word_count <= 220):
            try:
                refine_prompt = f"Rewrite this script to be between 190-220 words while maintaining the same style. Return ONLY the script content:\n\n{response_content}"
                simple_messages = [
                    {"role": "system", "content": "You are a professional scriptwriter. Rewrite the given script to be between 190-220 words while maintaining the same style."},
                    {"role": "user", "content": refine_prompt}
                ]
                
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=simple_messages,
                    temperature=0.5,
                    max_tokens=400,
                    top_p=0.9,
                    stream=False
                )
                
                response_content = completion.choices[0].message.content.strip()
            except Exception as refine_error:
                print(f"Error during refinement: {refine_error}")
                # Continue with the original content if refinement fails
                pass

        session_id = generate_session_id(request.user_query)
        previous_scripts[session_id] = response_content

        return {
            "response": response_content, 
            "session_id": session_id,
            "word_count": count_words(response_content)
        }

    except Exception as e:
        print(f"Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

class RefineRequest(BaseModel):
    user_refinement: str
    session_id: str

@app.post("/refine", response_model=dict)
async def refine_script(request: RefineRequest):
    try:
        if request.session_id not in previous_scripts:
            raise HTTPException(
                status_code=404,
                detail="Previous script not found. Start a new session."
            )

        previous_script = previous_scripts[request.session_id]

        refinement_prompt = f"""
You are a professional scriptwriter. Below is the script to refine:
{previous_script}

User wants the following refinements: {request.user_refinement}

Rules:
1. Keep the word count between 190-220 words
2. Maintain the original style and tone
3. Incorporate the requested refinements
4. Return ONLY the refined script content without any additional messages, explanations, or markdown formatting
5. Format your response as a JSON object with a single key "script_content" containing the script text
"""

        messages = [
            {"role": "system", "content": "You are a professional scriptwriter who refines scripts based on user feedback."},
            {"role": "user", "content": refinement_prompt}
        ]

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.5,
            max_tokens=400,
            top_p=0.9,
            stream=False,
            response_format={"type": "json_object"}
        )

        response_content_raw = completion.choices[0].message.content.strip()
        
        # Parse the JSON response
        try:
            response_json = json.loads(response_content_raw)
            response_content = response_json.get("script_content", "")
        except json.JSONDecodeError:
            # Fallback: If JSON parsing fails, extract content between code blocks
            pattern = r'```(?:json)?\s*\{.*?"script_content"\s*:\s*"(.*?)"\s*\}?\s*```'
            match = re.search(pattern, response_content_raw, re.DOTALL)
            if match:
                response_content = match.group(1).replace('\\n', '\n').replace('\\"', '"')
            else:
                # If all else fails, use the raw content
                response_content = response_content_raw

        # Update the stored script
        previous_scripts[request.session_id] = response_content

        return {
            "response": response_content,
            "session_id": request.session_id,
            "word_count": count_words(response_content)
        }
    except Exception as e:
        print(f"Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

class AnalysisRequest(BaseModel):
    script: str

@app.post("/analyze", response_model=dict)
async def analyze_script(request: AnalysisRequest):
    try:
        analysis_prompt = f"""
Analyze this script professionally:
{request.script}

Provide a detailed analysis including:
1. Tone and style assessment
2. Pacing evaluation
3. Narrative structure analysis
4. Engagement potential
5. Areas for improvement

Format your response as a JSON object with these keys:
- tone_style: string (assessment of tone and style)
- pacing: string (evaluation of pacing)
- structure: string (analysis of narrative structure)
- engagement: string (assessment of engagement potential)
- improvements: array of strings (specific suggestions for improvement)
- overall_rating: number (1-10 scale)
"""

        messages = [
            {"role": "system", "content": "You are a professional script analyst who provides detailed feedback on scripts."},
            {"role": "user", "content": analysis_prompt}
        ]

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.5,
            max_tokens=800,
            top_p=0.9,
            stream=False,
            response_format={"type": "json_object"}
        )

        response_content = completion.choices[0].message.content.strip()
        
        # Parse the JSON response
        try:
            analysis = json.loads(response_content)
            return analysis
        except json.JSONDecodeError:
            # If JSON parsing fails, return an error
            raise HTTPException(status_code=500, detail="Failed to parse analysis response")
            
    except Exception as e:
        print(f"Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error analyzing script: {str(e)}")

if __name__ == "__main__":
    print("Script generation service started...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
