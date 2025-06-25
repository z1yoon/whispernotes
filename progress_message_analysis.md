# Progress Message Format Analysis

## Actual Backend Messages Found:

### File-uploader Service (main.py:394)
```python
progress_message = f"Uploading parts to storage... {len(parts)}/{total_parts} ({part_size_mb:.1f}MB) ✓"
```
**Example**: `"Uploading parts to storage... 3/5 (2.1MB) ✓"`

### Frontend SharedUpload (SharedUpload.tsx:663)
```typescript
const progressMessage = `Uploading part ${partNumber}/${totalParts} (${partSizeMB}MB)...`;
```
**Example**: `"Uploading part 3/5 (2.1MB)..."`

### Video Processor Service (main.py:237-275)
```python
await send_progress_update(session_id, 10, "Analyzing video file...", "processing")
await send_progress_update(session_id, 25, "Extracting audio track...", "processing")  
await send_progress_update(session_id, 40, "Enhancing audio quality...", "processing")
await send_progress_update(session_id, 60, "Sending to transcription service...", "processing")
```

### Whisper Transcriber Service (main.py:997-1139)
```python
await send_progress_update(session_id, 65, "Loading transcription models...", "processing")
await send_progress_update(session_id, 70, "Detecting language...", "processing")
await send_progress_update(session_id, 75, "Transcribing audio...", "processing")
await send_progress_update(session_id, 80, "Improving timestamp accuracy...", "processing")
await send_progress_update(session_id, 85, "Identifying speakers...", "processing")
await send_progress_update(session_id, 90, "Formatting transcription...", "processing")
await send_progress_update(session_id, 95, "Sending for analysis...", "processing")
await send_progress_update(session_id, 100, "Transcription complete!", "completed")
```

## Current Problematic Regex Pattern:
```typescript
const partMatch = message.match(/(?:part\s+|parts.*?\s+)(\d+)\/(\d+)/i);
```

## Issue:
The regex `parts.*?\s+` is non-greedy and stops at the first space after "parts", but the actual message is:
`"Uploading parts to storage... 3/5"` where there are multiple words and spaces between "parts" and the numbers.

## Correct Regex Pattern:
```typescript
const partMatch = message.match(/(?:uploading\s+parts?.*?(\d+)\/(\d+)|(?:part\s+)(\d+)\/(\d+))/i);
```

Or more simply:
```typescript  
const partMatch = message.match(/(\d+)\/(\d+)/);
```

## Recommended Fix:
Use a simpler pattern that just looks for the X/Y format anywhere in the message, since the context already tells us it's an upload progress message:

```typescript
const partMatch = message.match(/(\d+)\/(\d+)/);
if (partMatch) {
  return `Uploading part ${partMatch[1]}/${partMatch[2]} to storage...`;
}
```