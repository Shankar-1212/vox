import os
import base64
import json
import asyncio
import websockets
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import subprocess
import tempfile
import io

app = Flask(__name__)
app.config['SECRET_KEY'] = ''
socketio = SocketIO(app, cors_allowed_origins="*")

# Hume API configuration
HUME_API_KEY = ""
HUME_WEBSOCKET_URL = "wss://api.hume.ai/v0/stream/models"
MAX_AUDIO_LENGTH_MS = 5000  # 5 seconds maximum for Hume API

# Store audio chunks for each session
audio_buffers = {}

@app.route('/')
def index():
    return render_template('index.html')

def convert_to_wav(webm_data, trim_to_seconds=5):
    """Convert WebM audio data to WAV format using ffmpeg, optionally trimming to specified length."""
    try:
        # Create temporary files for input and output
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as input_file:
            input_file.write(webm_data)
            input_path = input_file.name
        
        output_path = input_path.replace('.webm', '.wav')
        
        # Command to convert and trim audio (if needed)
        cmd = [
            'ffmpeg', '-i', input_path,
            '-acodec', 'pcm_s16le',  # 16-bit PCM codec
            '-ac', '1',              # 1 channel (mono)
            '-ar', '16000',          # 16kHz sample rate
        ]
        
        # Add time limit (trim) if requested
        if trim_to_seconds > 0:
            cmd.extend(['-t', str(trim_to_seconds)])
            
        cmd.extend(['-y', output_path])  # Overwrite output file if it exists
        
        # Execute ffmpeg command with full error output
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"ffmpeg conversion failed with code {result.returncode}")
            print(f"Error output: {result.stderr}")
            return None
        
        # Read the converted WAV file
        with open(output_path, 'rb') as wav_file:
            wav_data = wav_file.read()
        
        # Clean up temporary files
        os.unlink(input_path)
        os.unlink(output_path)
        
        print(f"Successfully converted WebM to WAV: {len(webm_data)} bytes → {len(wav_data)} bytes")
        if trim_to_seconds > 0:
            print(f"Audio trimmed to {trim_to_seconds} seconds")
            
        return wav_data
    
    except Exception as e:
        print(f"Error converting WebM to WAV: {e}")
        return None

def get_audio_duration(audio_file_path):
    """Get duration of audio file in seconds using ffprobe."""
    try:
        cmd = [
            'ffprobe', 
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            audio_file_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"ffprobe failed with code {result.returncode}")
            print(f"Error output: {result.stderr}")
            return None
            
        duration = float(result.stdout.strip())
        return duration
        
    except Exception as e:
        print(f"Error getting audio duration: {e}")
        return None

async def send_to_hume(audio_data):
    """Send audio data to Hume AI WebSocket API and get prosody analysis."""
    headers = {"X-Hume-Api-Key": HUME_API_KEY}
    
    # Encode audio data to base64
    encoded_data = base64.b64encode(audio_data).decode('utf-8')
    
    # Prepare the message payload
    message = {
        "models": {
            "prosody": {}
        },
        "data": encoded_data
    }
    
    try:
        async with websockets.connect(
            f"{HUME_WEBSOCKET_URL}?api_key={HUME_API_KEY}", 
            extra_headers=headers
        ) as websocket:
            print("Connected to Hume API successfully")
            await websocket.send(json.dumps(message))
            print("Message sent to Hume API")
            response = await websocket.recv()
            print("Received response from Hume API")
            return json.loads(response)
    except Exception as e:
        print(f"Error connecting to Hume API: {e}")
        return {
            "error": str(e),
            "message": "Failed to connect to Hume API."
        }

@socketio.on('start_recording')
def handle_start_recording():
    """Initialize a new audio buffer for this recording session."""
    session_id = request.sid
    audio_buffers[session_id] = io.BytesIO()
    print(f"Started new recording session for {session_id}")

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    """Handle incoming audio chunk and add it to the buffer."""
    session_id = request.sid
    
    # Ensure we have a buffer for this session
    if session_id not in audio_buffers:
        audio_buffers[session_id] = io.BytesIO()
    
    # Decode and add chunk to buffer
    try:
        audio_bytes = base64.b64decode(data['audio'])
        print(f"Received audio chunk: {len(audio_bytes)} bytes")
        audio_buffers[session_id].write(audio_bytes)
    except Exception as e:
        print(f"Error handling audio chunk: {e}")
        emit('error', {"message": f"Error processing audio chunk: {str(e)}"})

@socketio.on('finish_recording')
def handle_finish_recording():
    """Process the complete audio buffer."""
    session_id = request.sid
    
    try:
        # Ensure we have data for this session
        if session_id not in audio_buffers:
            emit('prosody_results', {
                "error": "No data", 
                "message": "No audio data found for this session"
            })
            return
        
        # Get the complete audio data
        audio_buffers[session_id].seek(0)
        complete_audio = audio_buffers[session_id].read()
        print(f"Processing complete audio: {len(complete_audio)} bytes")
        
        # Always trim to 5 seconds to meet Hume API requirements
        wav_data = convert_to_wav(complete_audio, trim_to_seconds=5)
            
        if not wav_data:
            emit('prosody_results', {
                "error": "Conversion failed", 
                "message": "Failed to convert audio to WAV format"
            })
            return
        
        # Process converted WAV data with Hume API
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        results = loop.run_until_complete(send_to_hume(wav_data))
        loop.close()
        
        print("Hume API returned results:", json.dumps(results, indent=2))  # <-- Add this line

        # Send results back to the client
        emit('prosody_results', results)
        print("Sent prosody results to client")
        
        # Clean up
        del audio_buffers[session_id]
        
    except Exception as e:
        print(f"Error processing complete audio: {e}")
        emit('prosody_results', {"error": str(e), "message": "Server error processing audio data"})
        
    finally:
        # Ensure we clean up even if there was an error
        if session_id in audio_buffers:
            del audio_buffers[session_id]

@socketio.on('disconnect')
def handle_disconnect():
    """Clean up resources when a client disconnects."""
    session_id = request.sid
    if session_id in audio_buffers:
        del audio_buffers[session_id]
    print(f"Client {session_id} disconnected, cleaned up resources")

@socketio.on('audio_data')
def handle_audio_data(data):
    """Legacy handler for audio data - maintains backwards compatibility."""
    try:
        print("Received audio data from client (legacy method)")
        
        # Decode base64 data from client
        audio_bytes = base64.b64decode(data['audio'])
        print(f"Decoded audio size: {len(audio_bytes)} bytes")
        
        # Create temporary file to check duration
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name
        
        # Check if audio is too long and needs trimming
        duration = get_audio_duration(temp_path)
        os.unlink(temp_path)  # Remove temporary file
        
        if duration and duration > 5:
            print(f"Audio is {duration:.2f} seconds, trimming to 5 seconds")
            trim_to_seconds = 5
        else:
            trim_to_seconds = 0  # No trimming needed
        
        # Convert audio with optional trimming
        print("Converting audio data")
        wav_data = convert_to_wav(audio_bytes, trim_to_seconds=trim_to_seconds)
            
        if not wav_data:
            emit('prosody_results', {
                "error": "Conversion failed", 
                "message": "Failed to convert audio to WAV format"
            })
            return
        
        # Process converted WAV data with Hume AI
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        results = loop.run_until_complete(send_to_hume(wav_data))
        loop.close()
        
        # Send results back to the client
        emit('prosody_results', results)
        print("Sent prosody results to client")
    except Exception as e:
        print(f"Error processing audio data: {e}")
        emit('prosody_results', {"error": str(e), "message": "Server error processing audio data"})

        
if __name__ == '__main__':
    print(f"Starting Flask server with Hume API endpoint: {HUME_WEBSOCKET_URL}")
    socketio.run(app, debug=True)
