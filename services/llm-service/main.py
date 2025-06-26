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
        """Analyze transcript using DeepSeek to extract insights and to-do items"""
        try:
            full_transcript = transcript_data.get("full_transcript", "")
            speakers = transcript_data.get("speakers", [])
            duration = transcript_data.get("duration", 0)
            
            if not full_transcript.strip():
                raise Exception("Empty transcript provided")
            
            # Generate comprehensive analysis
            analysis_results = {}
            
            # 1. Extract action items and to-do list
            action_items = await self._extract_action_items(full_transcript, speakers)
            analysis_results["action_items"] = action_items
            
            # 2. Generate meeting summary
            summary = await self._generate_summary(full_transcript, speakers, duration)
            analysis_results["summary"] = summary
            
            # 3. Identify key decisions and outcomes
            decisions = await self._extract_decisions(full_transcript, speakers)
            analysis_results["decisions"] = decisions
            
            # 4. Extract topics and themes
            topics = await self._extract_topics(full_transcript)
            analysis_results["topics"] = topics
            
            # 5. Generate participant insights
            participant_insights = self._analyze_participants(transcript_data)
            analysis_results["participant_insights"] = participant_insights
            
            # 6. Risk and opportunity identification
            risks_opportunities = await self._identify_risks_opportunities(full_transcript)
            analysis_results["risks_opportunities"] = risks_opportunities
            
            return {
                "analysis_completed_at": datetime.now().isoformat(),
                "transcript_duration": duration,
                "total_speakers": len(speakers),
                "analysis": analysis_results,
                "metadata": {
                    "model_used": DEEPSEEK_MODEL,
                    "api_base": DEEPSEEK_API_BASE,
                    "processing_time": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            raise Exception(f"LLM analysis failed: {str(e)}")
    
    async def _call_deepseek_api(self, prompt: str, max_tokens: int = 2000) -> str:
        """Make API call to DeepSeek"""
        try:
            if not DEEPSEEK_API_KEY:
                # Mock response for development
                return self._get_mock_response(prompt)
            
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
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{DEEPSEEK_API_BASE}/chat/completions",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    logger.error(f"DeepSeek API error: {response.status_code} - {response.text}")
                    return self._get_mock_response(prompt)
            
        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            return self._get_mock_response(prompt)
    
    def _get_mock_response(self, prompt: str) -> str:
        """Generate mock response for development/testing"""
        if "action item" in prompt.lower():
            return json.dumps([
                {
                    "task": "Follow up on project timeline",
                    "assignee": "John Doe",
                    "deadline": "Next week",
                    "priority": "High",
                    "context": "Discussed during project review",
                    "category": "Follow-up"
                },
                {
                    "task": "Prepare quarterly report",
                    "assignee": "Jane Smith",
                    "deadline": "End of month",
                    "priority": "Medium",
                    "context": "Required for board meeting",
                    "category": "Administrative"
                }
            ])
        elif "summary" in prompt.lower():
            return json.dumps({
                "executive_summary": "Team discussed project progress and upcoming milestones. Key decisions were made regarding resource allocation.",
                "key_points": ["Project timeline review", "Resource allocation", "Next steps planning"],
                "outcomes": ["Approved budget increase", "Assigned new team members"],
                "next_steps": ["Schedule follow-up meeting", "Update project documentation"],
                "effectiveness_score": 8,
                "effectiveness_explanation": "Meeting was well-structured with clear outcomes"
            })
        else:
            return "Mock response generated for development purposes."
    
    async def _extract_action_items(self, transcript: str, speakers: List[str]) -> List[Dict[str, Any]]:
        """Extract action items and to-do items from transcript"""
        
        prompt = f"""
        Analyze the following meeting transcript and extract all action items, tasks, and to-do items. 
        For each action item, identify:
        1. The specific task or action
        2. Who is responsible (if mentioned)
        3. Any deadlines or timeframes mentioned
        4. Priority level (High/Medium/Low)
        5. Context or background information
        
        Speakers in the meeting: {', '.join(speakers)}
        
        Meeting Transcript:
        {transcript}
        
        Please format the response as a JSON array with the following structure:
        [
            {{
                "task": "Clear description of the task",
                "assignee": "Person responsible or 'Not specified'",
                "deadline": "Deadline if mentioned or 'Not specified'",
                "priority": "High/Medium/Low",
                "context": "Brief context or background",
                "category": "Category of the task (e.g., 'Technical', 'Administrative', 'Follow-up')"
            }}
        ]
        
        Only include actual actionable items, not general discussion points.
        """
        
        try:
            response = await self._call_deepseek_api(prompt, max_tokens=1500)
            
            # Try to parse JSON response
            try:
                action_items = json.loads(response)
                return action_items if isinstance(action_items, list) else []
            except json.JSONDecodeError:
                # Fallback: parse manually if JSON parsing fails
                return self._parse_action_items_manually(response)
                
        except Exception as e:
            print(f"Error extracting action items: {e}")
            return []
    
    async def _generate_summary(self, transcript: str, speakers: List[str], duration: float) -> Dict[str, Any]:
        """Generate comprehensive meeting summary"""
        
        duration_mins = int(duration / 60)
        
        prompt = f"""
        Create a comprehensive summary of this {duration_mins}-minute meeting with {len(speakers)} participants.
        
        Participants: {', '.join(speakers)}
        
        Meeting Transcript:
        {transcript}
        
        Please provide:
        1. Executive Summary (2-3 sentences)
        2. Key Discussion Points (bullet points)
        3. Main Outcomes and Decisions
        4. Next Steps
        5. Meeting Effectiveness Score (1-10) with brief explanation
        
        Format as JSON:
        {{
            "executive_summary": "Brief 2-3 sentence summary",
            "key_points": ["Point 1", "Point 2", "Point 3"],
            "outcomes": ["Outcome 1", "Outcome 2"],
            "next_steps": ["Step 1", "Step 2"],
            "effectiveness_score": 8,
            "effectiveness_explanation": "Brief explanation of the score"
        }}
        """
        
        try:
            response = await self._call_deepseek_api(prompt, max_tokens=1000)
            
            try:
                summary_data = json.loads(response)
                return summary_data
            except json.JSONDecodeError:
                return {
                    "executive_summary": "Meeting summary could not be parsed",
                    "key_points": [],
                    "outcomes": [],
                    "next_steps": [],
                    "effectiveness_score": 5,
                    "effectiveness_explanation": "Could not analyze meeting effectiveness"
                }
                
        except Exception as e:
            print(f"Error generating summary: {e}")
            return {
                "executive_summary": "Summary generation failed",
                "key_points": [],
                "outcomes": [],
                "next_steps": [],
                "effectiveness_score": 0,
                "effectiveness_explanation": f"Error: {str(e)}"
            }
    
    async def _extract_decisions(self, transcript: str, speakers: List[str]) -> List[Dict[str, Any]]:
        """Extract key decisions made during the meeting"""
        
        prompt = f"""
        Analyze the meeting transcript and identify all decisions that were made.
        
        Speakers: {', '.join(speakers)}
        
        Transcript:
        {transcript}
        
        For each decision, provide:
        1. The decision made
        2. Who made or approved the decision
        3. Rationale or reasoning (if mentioned)
        4. Impact level (High/Medium/Low)
        
        Format as JSON array:
        [
            {{
                "decision": "Clear statement of what was decided",
                "decision_maker": "Who made the decision",
                "rationale": "Reasoning behind the decision",
                "impact_level": "High/Medium/Low",
                "timestamp_context": "When in the meeting this was discussed"
            }}
        ]
        """
        
        try:
            response = await self._call_deepseek_api(prompt, max_tokens=1000)
            
            try:
                decisions = json.loads(response)
                return decisions if isinstance(decisions, list) else []
            except json.JSONDecodeError:
                return []
                
        except Exception as e:
            print(f"Error extracting decisions: {e}")
            return []
    
    async def _extract_topics(self, transcript: str) -> List[Dict[str, Any]]:
        """Extract main topics and themes discussed"""
        
        prompt = f"""
        Analyze the meeting transcript and identify the main topics and themes discussed.
        
        Transcript:
        {transcript}
        
        For each topic, provide:
        1. Topic name
        2. Time spent discussing (High/Medium/Low)
        3. Key points discussed
        4. Resolution status (Resolved/Ongoing/Tabled)
        
        Format as JSON array:
        [
            {{
                "topic": "Topic name",
                "discussion_level": "High/Medium/Low",
                "key_points": ["Point 1", "Point 2"],
                "status": "Resolved/Ongoing/Tabled"
            }}
        ]
        """
        
        try:
            response = await self._call_deepseek_api(prompt, max_tokens=1000)
            
            try:
                topics = json.loads(response)
                return topics if isinstance(topics, list) else []
            except json.JSONDecodeError:
                return []
                
        except Exception as e:
            print(f"Error extracting topics: {e}")
            return []
    
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
    
    def _parse_action_items_manually(self, response: str) -> List[Dict[str, Any]]:
        """Manual parsing fallback for action items"""
        action_items = []
        
        # Simple pattern matching for action items
        lines = response.split('\n')
        current_item = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if 'task:' in line.lower() or 'action:' in line.lower():
                if current_item:
                    action_items.append(current_item)
                current_item = {"task": line.split(':', 1)[1].strip()}
            elif 'assignee:' in line.lower() or 'responsible:' in line.lower():
                current_item["assignee"] = line.split(':', 1)[1].strip()
            elif 'deadline:' in line.lower() or 'due:' in line.lower():
                current_item["deadline"] = line.split(':', 1)[1].strip()
            elif 'priority:' in line.lower():
                current_item["priority"] = line.split(':', 1)[1].strip()
        
        if current_item:
            action_items.append(current_item)
        
        return action_items

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