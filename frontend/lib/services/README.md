# VisionVox Transcription and Caption Generation

This module provides automatic transcription and caption generation for the VisionVox video editor using ElevenLabs' Scribe API.

## Features

- **Automatic Transcription**: Convert audio to text with precise word-level timing information
- **Customizable Caption Generation**: Control how captions are segmented with options for:
  - Words per caption
  - Characters per caption
  - Duration per caption
- **Integration with Scripts**: Generate captions from scripts created in the Script Panel
- **Direct Timeline Integration**: Captions are automatically positioned to match audio timing

## How to Use

### Required Environment Setup

1. Add `ELEVENLABS_API_KEY` to your `.env.local` file:
```
ELEVENLABS_API_KEY=your-api-key-here
```

### Generating Captions from Audio

1. Add audio to your timeline
2. Open the Captions Panel
3. Select the audio track from the dropdown
4. Click "Generate Captions"
5. Fine-tune caption timing and text as needed

### Generating Captions from Scripts

1. Create a script in the Scripts Panel
2. Click "Generate Captions" on that script
3. In the Captions Panel, click "From Script"
4. Adjust timing manually as needed

### Customizing Caption Generation

In the "Settings" tab, you can customize:

- **Max Words Per Caption**: Controls the maximum number of words in each caption (default: 7)
- **Max Characters**: Limits the total characters per caption (default: 42)
- **Max Duration**: Sets the maximum duration in seconds for each caption (default: 3s)
- **Merge Spacing**: Whether to combine spacing words in the transcription

## Implementation Details

The transcription and caption generation process works in these steps:

1. The audio file is sent to ElevenLabs' Scribe API
2. The API returns detailed transcription with word-level timing
3. The TranscriptionService processes this data into caption segments
4. Captions are adjusted to match audio position on timeline
5. The CaptionGenerator component displays and manages captions

## API Response Structure

The Scribe API returns detailed information about the transcription:

```json
{
  "language_code": "en",
  "language_probability": 0.98,
  "text": "Hello world!",
  "words": [
    {
      "text": "Hello",
      "type": "word",
      "start": 0,
      "end": 0.5,
      "speaker_id": "speaker_1",
      "characters": [/* Character details */]
    },
    // More words...
  ]
}
```

## Future Enhancements

- Speaker detection and identification
- Multiple voice styles for captions
- More advanced timing adjustments
- Integration with voice cloning 