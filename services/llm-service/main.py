import os
import json
import openai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime
import pika
import re
from typing import List, Dict, Any
import sys
sys.path.append('../')
from shared_utils import MessageBroker, StorageManager, CacheManager, EventTypes, Queues, Exchanges

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
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://whisper:notes2024@localhost:5672/")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "whisper-files")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# DeepSeek Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_BASE = os.getenv("DEEPSEEK_API_BASE", "https://test-llm.rdc.nie.edu.sg/api/v1/")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "DeepSeek-R1-Distill-Qwen-32B")

# Initialize services
message_broker = MessageBroker(RABBITMQ_URL)
storage_manager = StorageManager(MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET)
cache_manager = CacheManager(REDIS_URL)

# Setup queues and exchanges
message_broker.declare_exchange(Exchanges.WHISPERNOTES)
message_broker.declare_queue(Queues.ANALYSIS)
message_broker.declare_queue(Queues.NOTIFICATIONS)

# Configure OpenAI client for DeepSeek
openai.api_key = DEEPSEEK_API_KEY
openai.api_base = DEEPSEEK_API_BASE

class LLMAnalyzer:
    def __init__(self):
        self.temp_dir = "/tmp/analysis"
        os.makedirs(self.temp_dir, exist_ok=True)
    
    def analyze_transcript(self, transcript_data: Dict[str, Any]) -> Dict[str, Any]:
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
            action_items = self._extract_action_items(full_transcript, speakers)
            analysis_results["action_items"] = action_items
            
            # 2. Generate meeting summary
            summary = self._generate_summary(full_transcript, speakers, duration)
            analysis_results["summary"] = summary
            
            # 3. Identify key decisions and outcomes
            decisions = self._extract_decisions(full_transcript, speakers)
            analysis_results["decisions"] = decisions
            
            # 4. Extract topics and themes
            topics = self._extract_topics(full_transcript)
            analysis_results["topics"] = topics
            
            # 5. Generate participant insights
            participant_insights = self._analyze_participants(transcript_data)
            analysis_results["participant_insights"] = participant_insights
            
            # 6. Risk and opportunity identification
            risks_opportunities = self._identify_risks_opportunities(full_transcript)
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
    
    def _call_deepseek_api(self, prompt: str, max_tokens: int = 2000) -> str:
        """Make API call to DeepSeek"""
        try:
            response = openai.ChatCompletion.create(
                model=DEEPSEEK_MODEL,
                messages=[
                    {"role": "system", "content": "You are an intelligent meeting assistant that analyzes transcripts to extract actionable insights, create to-do lists, and provide comprehensive meeting analysis."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.3,
                top_p=0.9
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"DeepSeek API error: {e}")
            raise Exception(f"Failed to call DeepSeek API: {str(e)}")
    
    def _extract_action_items(self, transcript: str, speakers: List[str]) -> List[Dict[str, Any]]:
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
            response = self._call_deepseek_api(prompt, max_tokens=1500)
            
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
    
    def _generate_summary(self, transcript: str, speakers: List[str], duration: float) -> Dict[str, Any]:
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
            response = self._call_deepseek_api(prompt, max_tokens=1000)
            
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
    
    def _extract_decisions(self, transcript: str, speakers: List[str]) -> List[Dict[str, Any]]:
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
            response = self._call_deepseek_api(prompt, max_tokens=1000)
            
            try:
                decisions = json.loads(response)
                return decisions if isinstance(decisions, list) else []
            except json.JSONDecodeError:
                return []
                
        except Exception as e:
            print(f"Error extracting decisions: {e}")
            return []
    
    def _extract_topics(self, transcript: str) -> List[Dict[str, Any]]:
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
            response = self._call_deepseek_api(prompt, max_tokens=1000)
            
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
    
    def _identify_risks_opportunities(self, transcript: str) -> Dict[str, Any]:
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
            response = self._call_deepseek_api(prompt, max_tokens=800)
            
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

def process_analysis_message(ch, method, properties, body):
    """Process analysis message from RabbitMQ"""
    try:
        message = json.loads(body)
        
        # Process analysis
        result = process_transcript_analysis(message)
        
        # Acknowledge message
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        print(f"Error processing analysis message: {e}")
        # Reject message and don't requeue
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def process_transcript_analysis(message_data: dict):
    """Process transcript analysis with DeepSeek"""
    file_id = message_data['file_id']
    transcript_data = message_data['transcript_data']
    
    try:
        print(f"Starting analysis for file {file_id}")
        
        # Update status
        cache_manager.set(f"processing_status:{file_id}", {
            "status": "analyzing",
            "message": "Generating intelligent insights and to-do list...",
            "progress": 80
        }, expire=3600)
        
        # Analyze transcript with DeepSeek
        analysis_results = analyzer.analyze_transcript(transcript_data)
        
        # Store analysis results in MinIO
        analysis_json = json.dumps(analysis_results, indent=2)
        analysis_path = f"{analyzer.temp_dir}/{file_id}_analysis.json"
        
        with open(analysis_path, 'w') as f:
            f.write(analysis_json)
        
        analysis_object_name = f"analysis/{file_id}/analysis.json"
        storage_manager.upload_file(analysis_path, analysis_object_name, "application/json")
        
        os.remove(analysis_path)
        
        # Update file metadata
        completed_data = {
            **message_data,
            "analysis_results": analysis_results,
            "analysis_object_name": analysis_object_name,
            "analyzed_at": datetime.now().isoformat(),
            "processing_stage": "completed"
        }
        
        # Store completed data
        cache_manager.set(f"file:{file_id}", completed_data, expire=86400)
        
        # Update status
        cache_manager.set(f"processing_status:{file_id}", {
            "status": "completed",
            "message": "Processing completed successfully!",
            "progress": 100
        }, expire=3600)
        
        # Publish completion message
        message_broker.publish_message(
            Exchanges.WHISPERNOTES,
            "processing.completed",
            completed_data
        )
        
        print(f"Analysis completed for file {file_id}")
        
    except Exception as e:
        error_msg = f"Analysis failed: {str(e)}"
        print(error_msg)
        
        # Update error status
        cache_manager.set(f"processing_status:{file_id}", {
            "status": "error",
            "message": error_msg,
            "progress": 0
        }, expire=3600)
        
        # Publish error message
        error_data = {
            **message_data,
            "error": error_msg,
            "failed_at": datetime.now().isoformat(),
            "processing_stage": "analysis"
        }
        
        message_broker.publish_message(
            Exchanges.WHISPERNOTES,
            "processing.failed",
            error_data
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "llm-analysis"}

@app.get("/analysis/{file_id}")
async def get_analysis_results(file_id: str):
    """Get analysis results for a file"""
    file_data = cache_manager.get(f"file:{file_id}")
    if file_data and "analysis_results" in file_data:
        return file_data["analysis_results"]
    else:
        raise HTTPException(status_code=404, detail="Analysis results not found")

# Start consuming messages when the service starts
def start_consuming():
    """Start consuming messages from RabbitMQ"""
    try:
        # Bind queue to exchange
        message_broker.channel.queue_bind(
            exchange=Exchanges.WHISPERNOTES,
            queue=Queues.ANALYSIS,
            routing_key="transcription.completed"
        )
        
        # Set up consumer
        message_broker.channel.basic_consume(
            queue=Queues.ANALYSIS,
            on_message_callback=process_analysis_message
        )
        
        print("LLM Analysis Service started. Waiting for messages...")
        message_broker.channel.start_consuming()
        
    except KeyboardInterrupt:
        print("Stopping LLM analysis service...")
        message_broker.channel.stop_consuming()
        message_broker.close()

if __name__ == "__main__":
    import threading
    
    # Start RabbitMQ consumer in a separate thread
    consumer_thread = threading.Thread(target=start_consuming, daemon=True)
    consumer_thread.start()
    
    # Start FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=8000)