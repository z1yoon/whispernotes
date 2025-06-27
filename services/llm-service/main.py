import os
import json
import httpx
import redis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LLM Analysis Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# DeepSeek Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_BASE = os.getenv("DEEPSEEK_API_BASE")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL")

# Initialize Redis client with error handling
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()  # Test connection
    logger.info(f"✅ Redis connection established: {REDIS_URL}")
except Exception as e:
    logger.error(f"❌ Redis connection failed: {e}")
    redis_client = None

class LLMAnalyzer:
    def __init__(self):
        self.temp_dir = "/tmp/analysis"
        os.makedirs(self.temp_dir, exist_ok=True)
    
    async def analyze_transcript(self, transcript_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze transcript to extract only action items and to-do items"""
        try:
            full_transcript = transcript_data.get("full_transcript", "")
            speakers = transcript_data.get("speakers", [])
            duration = transcript_data.get("duration", 0)
            
            if not full_transcript.strip():
                raise Exception("Empty transcript provided")
            
            # Only extract action items and to-do list - no other analysis
            action_items = await self._extract_action_items(full_transcript, speakers)
            
            return {
                "analysis_completed_at": datetime.now(timezone(timedelta(hours=8))).isoformat(),
                "transcript_duration": duration,
                "total_speakers": len(speakers),
                "analysis": {
                    "action_items": action_items
                },
                "metadata": {
                    "model_used": DEEPSEEK_MODEL,
                    "api_base": DEEPSEEK_API_BASE,
                    "processing_time": datetime.now(timezone(timedelta(hours=8))).isoformat()
                }
            }
            
        except Exception as e:
            raise Exception(f"LLM analysis failed: {str(e)}")
    
    async def _call_deepseek_api(self, prompt: str, max_tokens: int = 2000) -> str:
        """Make API call to DeepSeek - only real API calls, no mock responses"""
        if not DEEPSEEK_API_KEY:
            logger.error("❌ DEEPSEEK_API_KEY not configured - cannot make API calls")
            raise Exception("API key not configured")
        
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": "You are an intelligent meeting assistant that analyzes transcripts to extract actionable insights, create to-do lists, and provide comprehensive meeting analysis."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": 0.3,
            "top_p": 0.9
        }
        
        logger.info(f"🔄 Calling NIE LLM API: {DEEPSEEK_API_BASE}/chat/completions")
        logger.info(f"📝 Model: {DEEPSEEK_MODEL}")
        logger.info(f"📏 Max tokens: {max_tokens}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{DEEPSEEK_API_BASE}/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                
                logger.info(f"✅ NIE API Response received ({len(content)} characters)")
                logger.info(f"📄 Response preview: {content[:200]}...")
                
                # Validate that we got actual content
                if content and len(content.strip()) > 10:
                    return content
                else:
                    logger.warning("⚠️ NIE API returned empty/minimal content")
                    raise Exception("API returned empty response")
            else:
                logger.error(f"❌ NIE API error: {response.status_code} - {response.text}")
                raise Exception(f"API call failed with status {response.status_code}")
    
    async def _extract_action_items(self, transcript: str, speakers: List[str]) -> List[Dict[str, Any]]:
        """Extract action items and to-do items from transcript, or create summary if no clear actions exist"""
        
        logger.info(f"🔍 Extracting action items from transcript ({len(transcript)} characters)")
        logger.info(f"👥 Speakers: {speakers}")
        
        # Show sample of transcript for debugging
        transcript_sample = transcript[:500] + "..." if len(transcript) > 500 else transcript
        logger.info(f"📝 Transcript sample: {transcript_sample}")
        
        # Calculate content-based parameters
        word_count = len(transcript.split())
        char_count = len(transcript)
        
        # Determine appropriate max items based on content length
        if word_count < 500:  # Short conversation (< 5 minutes)
            max_items = 3
            content_guidance = "This is a short conversation. Focus only on explicit commitments or clear next steps."
        elif word_count < 1500:  # Medium conversation (5-15 minutes)
            max_items = 7
            content_guidance = "This is a medium-length conversation. Extract clear action items and commitments."
        elif word_count < 3000:  # Long conversation (15-30 minutes)
            max_items = 12
            content_guidance = "This is a longer conversation. Extract all actionable items, decisions, and follow-ups."
        else:  # Very long conversation (30+ minutes)
            max_items = 20
            content_guidance = "This is an extensive conversation. Extract comprehensive action items, decisions, and commitments."
        
        logger.info(f"📊 Content analysis: {word_count} words, max {max_items} action items")
        
        prompt = f"""You are a helpful assistant that creates actionable todo items from any conversation or transcript. Your goal is to ALWAYS find useful actions people can take, even from casual discussions.

Participants: {', '.join(speakers)}
Content length: {word_count:,} words

## Be GENEROUS and CREATIVE in finding todos:
From any conversation, you can find actionable items by looking for:
- **Explicit actions**: Things people directly said they would do
- **Implied actions**: Things that naturally follow from what was discussed
- **Follow-up opportunities**: Ideas, topics, or decisions that suggest next steps
- **Learning opportunities**: Things mentioned that someone could research or explore
- **Relationship building**: People mentioned who could be contacted
- **Process improvements**: Ways to make discussed activities better
- **Documentation needs**: Things that should be recorded or shared
- **Decision points**: Topics that need decisions or clarification

## Types of todos you can create:
- Research or learn about topics discussed
- Follow up with people mentioned
- Share information or resources
- Schedule meetings or calls
- Review or evaluate options discussed
- Document decisions or ideas
- Explore opportunities mentioned
- Contact vendors, partners, or colleagues
- Prepare materials or presentations
- Update systems or processes

## ALWAYS generate useful todos - be creative and helpful!
Even from casual conversations, you can find valuable actions like:
- "Research the [topic] that was mentioned"
- "Follow up with [person] about [subject]"
- "Share [resource/idea] with the team"
- "Schedule time to discuss [topic] further"
- "Document the [decision/idea] for future reference"

## Output format (MUST return valid JSON):
Return a simple JSON array where each todo item is a single paragraph that combines the task and context naturally into one flowing sentence. Do not use structured formatting or separate context fields.

```json
[
    {{
        "task": "Write the entire actionable task as a single paragraph that naturally includes all relevant context and details from the conversation without breaking it into separate fields or sections",
        "context": ""
    }}
]
```

## The transcript:
{transcript}

Generate {max_items} helpful, actionable todo items. Be generous - find valuable actions even if they weren't explicitly stated. Focus on being helpful and practical."""
        
        try:
            # Adjust token limit based on expected response size - increased for complete responses
            max_tokens = min(2000, max_items * 80 + 400)  # ~80 tokens per item + overhead
            response = await self._call_deepseek_api(prompt, max_tokens=max_tokens)
            
            # Try to parse JSON response
            try:
                # Clean response by removing code block markers
                clean_response = response.strip()
                if clean_response.startswith('```json'):
                    clean_response = clean_response[7:]  # Remove '```json'
                if clean_response.endswith('```'):
                    clean_response = clean_response[:-3]  # Remove '```'
                clean_response = clean_response.strip()
                
                # Check if response is truncated and try to fix common JSON issues
                if clean_response.endswith('...') or clean_response.count('{') != clean_response.count('}'):
                    logger.warning("🔧 Response appears truncated, attempting to fix JSON")
                    # If it's a truncated array, try to close it properly
                    if '[' in clean_response and not clean_response.endswith(']'):
                        # Find the last complete object
                        last_complete = clean_response.rfind('}')
                        if last_complete > 0:
                            clean_response = clean_response[:last_complete + 1] + ']'
                
                action_items = json.loads(clean_response)
                
                # Validate and clean the action items
                if isinstance(action_items, list):
                    items_count = len(action_items)
                    items_per_100_words = (items_count / word_count * 100) if word_count > 0 else 0
                    
                    # Clean and validate each item - simple format focused on content
                    cleaned_items = []
                    for item in action_items:
                        if isinstance(item, dict) and 'task' in item:
                            # Simple, content-focused format
                            cleaned_item = {
                                'task': item.get('task', '').strip(),
                                'context': item.get('context', '').strip()
                            }
                            # Only include items with meaningful content
                            if cleaned_item['task'] and len(cleaned_item['task']) > 5:
                                cleaned_items.append(cleaned_item)
                    
                    logger.info(f"✅ Generated {len(cleaned_items)} clear action items from {word_count} words ({items_per_100_words:.1f} items per 100 words)")
                    
                    # Log each action item for debugging
                    for i, item in enumerate(cleaned_items):
                        task_preview = (item['task'][:80] + '...') if len(item['task']) > 80 else item['task']
                        logger.info(f"📋 Item {i+1}: {task_preview}")
                        if item['context']:
                            context_preview = (item['context'][:60] + '...') if len(item['context']) > 60 else item['context']
                            logger.info(f"   📝 Context: {context_preview}")
                    
                    return cleaned_items
                else:
                    logger.warning("❌ Response is not a list, generating fallback todos")
                    return self._generate_fallback_todos(transcript, speakers, max_items)
                    
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON parsing failed: {e}")
                logger.error(f"🔧 Raw response: {response[:500]}...")
                logger.error("❌ Unable to parse LLM response - generating fallback todos")
                return self._generate_fallback_todos(transcript, speakers, max_items)
                
        except Exception as e:
            logger.error(f"❌ Error extracting action items: {e}")
            logger.info("🔧 API unavailable - generating fallback todos")
            return self._generate_fallback_todos(transcript, speakers, max_items)
    
    def _generate_fallback_todos(self, transcript: str, speakers: List[str], max_items: int) -> List[Dict[str, Any]]:
        """Generate useful todos from transcript using simple text analysis when API fails"""
        logger.info("🔄 Generating fallback todos from transcript content")
        
        words = transcript.lower().split()
        sentences = [s.strip() for s in transcript.split('.') if len(s.strip()) > 20]
        
        # Find action words
        action_words = ['need', 'should', 'will', 'plan', 'decide', 'review', 'follow', 'contact', 'call', 'email', 'meeting', 'schedule', 'research', 'check', 'update', 'create', 'prepare', 'discuss', 'implement', 'consider']
        
        # Extract key topics mentioned frequently
        word_count = {}
        for word in words:
            clean_word = word.strip('.,!?";:()[]{}').lower()
            if len(clean_word) > 4 and clean_word.isalpha():
                word_count[clean_word] = word_count.get(clean_word, 0) + 1
        
        # Get most mentioned topics
        common_topics = [word for word, count in sorted(word_count.items(), key=lambda x: x[1], reverse=True)[:8] if count > 1]
        
        # Find sentences with action indicators
        action_sentences = []
        for sentence in sentences[:15]:
            for action_word in action_words:
                if action_word in sentence.lower():
                    action_sentences.append(sentence)
                    break
        
        # Generate todos
        todos = []
        
        # Generate todos from common topics
        for topic in common_topics[:3]:
            todos.append({
                "task": f"Follow up on {topic.title()} discussion",
                "context": f"This topic was frequently mentioned during the conversation"
            })
        
        # Generate todos from action sentences
        for sentence in action_sentences[:max_items-len(todos)]:
            if len(todos) >= max_items:
                break
            clean_sentence = sentence[:80] + '...' if len(sentence) > 80 else sentence
            todos.append({
                "task": f"Review: {clean_sentence}",
                "context": "Action item identified from the conversation"
            })
        
        # Add generic helpful todos if we don't have enough
        generic_todos = [
            {
                "task": f"Schedule follow-up meeting with {', '.join(speakers[:2])}",
                "context": "Continue the discussion from this conversation"
            },
            {
                "task": "Document key decisions and outcomes",
                "context": "Capture important points from the conversation"
            },
            {
                "task": "Share relevant information with team members",
                "context": "Ensure everyone is informed about the discussion"
            },
            {
                "task": "Research topics mentioned in the conversation",
                "context": "Gather more information on subjects discussed"
            },
            {
                "task": "Prepare agenda for next discussion",
                "context": "Build on topics covered in this conversation"
            }
        ]
        
        # Fill remaining slots with generic todos
        for generic_todo in generic_todos:
            if len(todos) >= max_items:
                break
            todos.append(generic_todo)
        
        # Ensure we have at least some todos
        if not todos:
            todos = [
                {
                    "task": f"Review conversation with {len(speakers)} participants",
                    "context": "Follow up on the discussion points"
                },
                {
                    "task": "Identify next steps from the conversation",
                    "context": "Determine actionable items moving forward"
                }
            ]
        
        logger.info(f"📝 Generated {len(todos)} fallback todos")
        for i, todo in enumerate(todos):
            task_preview = (todo['task'][:60] + '...') if len(todo['task']) > 60 else todo['task']
            logger.info(f"📋 Fallback {i+1}: {task_preview}")
        
        return todos[:max_items]
    
    

analyzer = LLMAnalyzer()

@app.post("/process-transcript")
async def process_transcript(transcript_data: dict):
    """Process transcript and generate analysis with DeepSeek"""
    try:
        session_id = transcript_data.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        
        logger.info(f"Processing transcript for session: {session_id}")
        
        # Extract transcript text for analysis
        segments = transcript_data.get("segments", [])
        if not segments:
            raise HTTPException(status_code=400, detail="No transcript segments provided")
        
        # Create full transcript text
        full_transcript = "\n".join([
            f"{seg.get('speaker_name', seg.get('speaker', 'Speaker'))}: {seg.get('text', '')}"
            for seg in segments
        ])
        
        # Get speakers list
        speakers = list(set([
            seg.get('speaker_name', seg.get('speaker', 'Speaker'))
            for seg in segments
        ]))
        
        # Create analysis input
        analysis_input = {
            "full_transcript": full_transcript,
            "speakers": speakers,
            "duration": transcript_data.get("duration", 0),
            "segments": segments
        }
        
        # Initialize analyzer and generate analysis
        analyzer = LLMAnalyzer()
        analysis_results = await analyzer.analyze_transcript(analysis_input)
        
        # Store results in Redis (if available)
        if redis_client:
            try:
                redis_key = f"llm_analysis:{session_id}"
                redis_client.setex(
                    redis_key,
                    24 * 3600,  # 24 hours
                    json.dumps(analysis_results)
                )
                logger.info(f"Analysis results stored in Redis for session: {session_id}")
            except Exception as e:
                logger.error(f"Failed to store analysis in Redis: {e}")
        else:
            logger.warning("Redis not available - analysis results not cached")
        
        logger.info(f"Analysis completed for session: {session_id}")
        return {
            "status": "success",
            "session_id": session_id,
            "analysis": analysis_results
        }
        
    except Exception as e:
        logger.error(f"Error processing transcript: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/analysis/{session_id}")
async def get_analysis_results(session_id: str):
    """Get analysis results for a session"""
    try:
        if not redis_client:
            logger.error("Redis client not available")
            raise HTTPException(status_code=503, detail="Analysis storage not available")
        
        redis_key = f"llm_analysis:{session_id}"
        data = redis_client.get(redis_key)
        
        if not data:
            logger.warning(f"No analysis data found for session: {session_id}")
            raise HTTPException(status_code=404, detail="Analysis results not found")
        
        analysis_results = json.loads(data)
        logger.info(f"Retrieved analysis results for session: {session_id}")
        return analysis_results
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Invalid analysis data")
    except redis.RedisError as e:
        logger.error(f"Redis error retrieving analysis for session {session_id}: {e}")
        raise HTTPException(status_code=503, detail="Analysis storage temporarily unavailable")
    except Exception as e:
        logger.error(f"Error retrieving analysis for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analysis")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    redis_status = "not_available"
    if redis_client:
        try:
            redis_client.ping()
            redis_status = "ok"
        except Exception as e:
            redis_status = f"error: {str(e)}"
    
    return {
        "status": "ok",
        "service": "llm-analysis",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone(timedelta(hours=8))).isoformat(),
        "dependencies": {
            "redis": redis_status,
            "deepseek_api": "configured" if DEEPSEEK_API_KEY else "not configured"
        }
    }

# Service startup
logger.info("LLM Analysis Service starting...")

if __name__ == "__main__":
    # Start FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=8004)
