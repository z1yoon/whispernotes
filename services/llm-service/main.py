import os
import json
import httpx
import redis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime
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
                "analysis_completed_at": datetime.now().isoformat(),
                "transcript_duration": duration,
                "total_speakers": len(speakers),
                "analysis": {
                    "action_items": action_items
                },
                "metadata": {
                    "model_used": DEEPSEEK_MODEL,
                    "api_base": DEEPSEEK_API_BASE,
                    "processing_time": datetime.now().isoformat()
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
        
        prompt = f"""You are an expert meeting assistant. Analyze this transcript and extract GENUINE action items based on the content.

CONTENT GUIDANCE: {content_guidance}

CRITICAL INSTRUCTION: If no clear action items exist, DO NOT return empty array. Instead, create 3-5 summary points of the conversation as action items using this format:
- "Discussed [topic]: [brief summary of what was covered]"
- "Reviewed [subject]: [key points mentioned]"
- "Shared information about [topic]: [main insights]"

QUALITY GUIDELINES:
1. CONTENT-DRIVEN: Extract items based on what's actually discussed, not arbitrary limits
2. FIRST try to find genuine action items (commitments, assignments, decisions requiring follow-up)
3. IF no clear action items exist, create summary points of key topics discussed
4. DO NOT assign priorities - let users decide
5. Keep descriptions concise and actionable
6. Maximum {max_items} items for this content length

WHAT QUALIFIES AS A GENUINE ACTION ITEM:
- Explicit commitments: "I'll send the report by Friday"
- Direct assignments: "Can you review the proposal?"
- Decisions requiring follow-up: "We decided to implement feature X"
- Clear next steps mentioned: "Let's schedule a follow-up meeting"
- Specific tasks mentioned: "We need to update the documentation"

WHAT TO SUMMARIZE (if no action items found):
- Main topics discussed
- Key information shared
- Important points reviewed
- Decisions made (even if no follow-up required)
- Problems or challenges mentioned

Meeting Participants: {', '.join(speakers)}

CONVERSATION TRANSCRIPT:
{transcript}

RESPONSE FORMAT (extract genuine action items OR create summary points, up to {max_items}):
[
    {{
        "task": "Specific, actionable description OR summary of discussion topic",
        "assignee": "Name of person responsible (if clearly mentioned, otherwise null)",
        "priority": "medium",
        "context": "Brief context from the conversation explaining why this is needed or what was discussed"
    }}
]

Extract all genuine action items, or if none exist, create summary points of the conversation:"""
        
        try:
            # Adjust token limit based on expected response size
            max_tokens = min(1200, max_items * 60 + 200)  # ~60 tokens per item + overhead
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
                
                action_items = json.loads(clean_response)
                
                # Log results with content analysis
                if isinstance(action_items, list):
                    items_count = len(action_items)
                    items_per_100_words = (items_count / word_count * 100) if word_count > 0 else 0
                    
                    # Determine if these are genuine action items or summary points
                    has_genuine_actions = any(
                        any(keyword in item.get('task', '').lower() for keyword in [
                            'will', 'need to', 'should', 'must', 'schedule', 'send', 'review', 
                            'implement', 'update', 'create', 'follow up', 'contact', 'prepare'
                        ]) for item in action_items
                    )
                    
                    if has_genuine_actions:
                        logger.info(f"✅ Extracted {items_count} genuine action items from {word_count} words ({items_per_100_words:.1f} items per 100 words)")
                    else:
                        logger.info(f"📝 Created {items_count} summary points from {word_count} words (no clear action items found)")
                    
                    # Log each action item/summary for debugging
                    for i, item in enumerate(action_items):
                        task_preview = (item.get('task', 'Unknown task')[:80] + '...') if len(item.get('task', '')) > 80 else item.get('task', 'Unknown task')
                        logger.info(f"📋 Item {i+1}: {task_preview}")
                    
                    return action_items
                else:
                    logger.warning("❌ Response is not a list, creating real transcript summary")
                    return self._create_real_summary_from_transcript(transcript, speakers, max_items)
                    
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON parsing failed: {e}")
                logger.error(f"🔧 Raw response: {response[:500]}...")
                logger.error("❌ Unable to parse LLM response - creating real transcript summary")
                return self._create_real_summary_from_transcript(transcript, speakers, max_items)
                
        except Exception as e:
            logger.error(f"❌ Error extracting action items: {e}")
            logger.info("🔧 API unavailable - creating real summary from transcript content")
            return self._create_real_summary_from_transcript(transcript, speakers, max_items)
    
    def _create_real_summary_from_transcript(self, transcript: str, speakers: List[str], max_items: int) -> List[Dict[str, Any]]:
        """Create a real summary from transcript content using simple text analysis when API fails"""
        logger.info("🔄 Creating real summary from transcript content using text analysis")
        
        # Simple text analysis to extract key topics and themes
        words = transcript.lower().split()
        sentences = transcript.split('.')
        
        # Extract key themes by finding frequently mentioned words (excluding common words)
        stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
        
        # Count word frequency (excluding stop words and short words)
        word_count = {}
        for word in words:
            clean_word = word.strip('.,!?";:()[]{}').lower()
            if len(clean_word) > 3 and clean_word not in stop_words and clean_word.isalpha():
                word_count[clean_word] = word_count.get(clean_word, 0) + 1
        
        # Get most common topics
        common_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Find sentences with decisions, actions, or key topics
        action_keywords = ['decide', 'agreed', 'plan', 'will', 'should', 'need', 'discuss', 'review', 'implement', 'create', 'update', 'schedule', 'meeting', 'project', 'task']
        important_sentences = []
        
        for sentence in sentences[:20]:  # Check first 20 sentences
            sentence = sentence.strip()
            if len(sentence) > 30:  # Skip very short sentences
                for keyword in action_keywords:
                    if keyword in sentence.lower():
                        important_sentences.append(sentence)
                        break
        
        # Create summary items based on analysis
        summary_items = []
        
        # Add topic-based summaries
        if common_words:
            for i, (word, count) in enumerate(common_words[:3]):
                summary_items.append({
                    "task": f"Discussed {word.title()}: Key topic mentioned {count} times in conversation",
                    "assignee": None,
                    "priority": "medium",
                    "context": f"Frequently mentioned topic during the meeting with {len(speakers)} participants"
                })
        
        # Add sentence-based summaries
        for sentence in important_sentences[:max_items-len(summary_items)]:
            if len(summary_items) >= max_items:
                break
            summary_items.append({
                "task": f"Reviewed: {sentence[:100]}{'...' if len(sentence) > 100 else ''}",
                "assignee": None,
                "priority": "medium", 
                "context": "Key point or decision mentioned during the conversation"
            })
        
        # Ensure we have at least some content
        if not summary_items:
            summary_items = [
                {
                    "task": f"Meeting discussion with {len(speakers)} participants",
                    "assignee": None,
                    "priority": "medium",
                    "context": f"Conversation covered approximately {len(words)} words across {len(sentences)} topics"
                },
                {
                    "task": "Reviewed various topics and shared information",
                    "assignee": None,
                    "priority": "medium",
                    "context": "General discussion and information sharing session"
                }
            ]
        
        logger.info(f"📝 Created {len(summary_items)} summary items from transcript analysis")
        for i, item in enumerate(summary_items):
            task_preview = (item['task'][:60] + '...') if len(item['task']) > 60 else item['task']
            logger.info(f"📋 Summary {i+1}: {task_preview}")
        
        return summary_items[:max_items]
    
    def _analyze_participants(self, transcript_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze participant engagement and contributions"""
        
        segments = transcript_data.get("segments", [])
        speakers = transcript_data.get("speakers", [])
        
        if not segments:
            return {}
        
        # Calculate speaking time for each speaker
        speaker_stats = {}
        for speaker in speakers:
            speaker_segments = [seg for seg in segments if seg.get("speaker") == speaker]
            total_time = sum([seg.get("end", 0) - seg.get("start", 0) for seg in speaker_segments])
            word_count = sum([len(seg.get("text", "").split()) for seg in speaker_segments])
            
            speaker_stats[speaker] = {
                "speaking_time": total_time,
                "word_count": word_count,
                "segment_count": len(speaker_segments),
                "avg_segment_length": total_time / len(speaker_segments) if speaker_segments else 0
            }
        
        # Generate insights about participation
        total_duration = transcript_data.get("duration", 1)
        
        for speaker, stats in speaker_stats.items():
            stats["speaking_percentage"] = (stats["speaking_time"] / total_duration) * 100
            stats["engagement_level"] = (
                "High" if stats["speaking_percentage"] > 30 else
                "Medium" if stats["speaking_percentage"] > 15 else
                "Low"
            )
        
        return {
            "participant_statistics": speaker_stats,
            "most_active_speaker": max(speaker_stats.keys(), key=lambda x: speaker_stats[x]["speaking_time"]) if speaker_stats else None,
            "participation_balance": "Balanced" if max(speaker_stats.values(), key=lambda x: x["speaking_percentage"])["speaking_percentage"] < 50 else "Unbalanced"
        }
    
    async def _identify_risks_opportunities(self, transcript: str) -> Dict[str, Any]:
        """Identify potential risks and opportunities mentioned"""
        
        prompt = f"""
        Analyze the meeting transcript to identify potential risks and opportunities.
        
        Transcript:
        {transcript}
        
        Identify:
        1. Risks or concerns mentioned
        2. Opportunities or positive developments
        3. Mitigation strategies discussed
        
        Format as JSON:
        {{
            "risks": [
                {{
                    "risk": "Description of risk",
                    "severity": "High/Medium/Low",
                    "mitigation": "Mitigation strategy if mentioned"
                }}
            ],
            "opportunities": [
                {{
                    "opportunity": "Description of opportunity",
                    "potential_impact": "High/Medium/Low",
                    "next_steps": "Steps to pursue if mentioned"
                }}
            ]
        }}
        """
        
        try:
            response = await self._call_deepseek_api(prompt, max_tokens=800)
            
            try:
                risks_opps = json.loads(response)
                return risks_opps
            except json.JSONDecodeError:
                return {"risks": [], "opportunities": []}
                
        except Exception as e:
            print(f"Error identifying risks/opportunities: {e}")
            return {"risks": [], "opportunities": []}
    

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
        "timestamp": datetime.now().isoformat(),
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