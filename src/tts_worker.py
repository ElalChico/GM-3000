"""
GM-3000 TTS Worker
Standalone Python script for edge-tts synthesis.
"""
import asyncio
import json
import os
import sys
import tempfile
import uuid

def main():
    # Expect a payload file path as argument (or JSON via stdin)
    if len(sys.argv) >= 2 and os.path.isfile(sys.argv[1]):
        # Read JSON payload from file
        try:
            with open(sys.argv[1], 'r', encoding='utf-8-sig') as f:
                payload = json.load(f)
        except Exception as e:
            print(f"Failed to read payload file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Legacy: read JSON from argument or stdin
        if len(sys.argv) >= 2:
            try:
                payload = json.loads(sys.argv[1])
            except json.JSONDecodeError as e:
                print(f"Invalid JSON (arg): {e}", file=sys.stderr)
                sys.exit(1)
        else:
            try:
                payload = json.load(sys.stdin)
            except json.JSONDecodeError as e:
                print(f"Invalid JSON (stdin): {e}", file=sys.stderr)
                sys.exit(1)

    text = payload.get("text", "")
    voice = payload.get("voice", "es-MX-DaliaNeural")
    rate = payload.get("rate", "+0%")
    volume = payload.get("volume", "+0%")
    pitch = payload.get("pitch", "+0Hz")

    if not text:
        print("Empty text", file=sys.stderr)
        sys.exit(1)

    try:
        import edge_tts
    except ImportError:
        print("edge-tts not installed. Run: pip install edge-tts", file=sys.stderr)
        sys.exit(1)

    output_path = os.path.join(tempfile.gettempdir(), f"gm3000_tts_{uuid.uuid4().hex}.mp3")
    try:
        asyncio.run(_synthesize(edge_tts, text, voice, rate, volume, pitch, output_path))
    except Exception as e:
        print(f"Synthesis failed: {e}", file=sys.stderr)
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except OSError:
                pass
        sys.exit(1)

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        print("No audio generated (empty file)", file=sys.stderr)
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except OSError:
                pass
        sys.exit(1)

    print(output_path)

async def _synthesize(edge_tts, text, voice, rate, volume, pitch, output_path):
    communicate = edge_tts.Communicate(
        text,
        voice,
        rate=rate,
        volume=volume,
        pitch=pitch,
    )
    await communicate.save(output_path)

if __name__ == "__main__":
    main()
