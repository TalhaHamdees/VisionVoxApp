import { Caption, CaptionWord } from "@/components/editor/types";

// Define interfaces for ElevenLabs Scribe API response
export interface ScribeCharacter {
  text: string;
  start: number;
  end: number;
}

export interface ScribeWord {
  text: string;
  type: 'word' | 'spacing';
  start: number;
  end: number;
  speaker_id: string;
  characters: ScribeCharacter[];
}

export interface ScribeResponse {
  language_code: string;
  language_probability: number;
  text: string;
  words: ScribeWord[];
}

export interface TranscriptionOptions {
  wordsPerCaption?: number;
  charactersPerCaption?: number;
  maxDurationPerCaption?: number; // in milliseconds
  mergeSpacingWords?: boolean;
}

// Default options for transcription
const DEFAULT_OPTIONS: TranscriptionOptions = {
  wordsPerCaption: 7,
  charactersPerCaption: 42,
  maxDurationPerCaption: 3000, // 3 seconds
  mergeSpacingWords: true,
};

/**
 * Transcription Service
 * Provides functions for transcribing audio and converting to captions
 */
export const TranscriptionService = {
  /**
   * Transcribe an audio file using ElevenLabs Scribe API
   * @param audioFile The audio file to transcribe
   * @param apiKey Optional ElevenLabs API key to use for the request
   * @returns Promise with transcription result
   */
  async transcribeAudio(audioFile: File | Blob, apiKey?: string): Promise<ScribeResponse> {
    const formData = new FormData();
    formData.append('audio_file', audioFile);

    console.log('Sending audio file to transcription API...', {
      fileType: audioFile.type,
      fileSize: audioFile.size,
      fileName: audioFile instanceof File ? audioFile.name : 'unknown'
    });
    
    // Add API key to the form data if provided
    if (apiKey) {
      formData.append('api_key', apiKey);
    }
    
    try {
      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Transcription API error:', error);
        
        // Extract the most helpful error message
        let errorMessage = 'Unknown error';
        if (error.details && typeof error.details === 'object') {
          if (error.details.message) {
            errorMessage = error.details.message;
          } else if (error.details.detail) {
            errorMessage = error.details.detail;
          } else if (error.details.status && error.details.message) {
            errorMessage = error.details.message;
          } else if (error.status && error.statusText) {
            errorMessage = `${error.status} ${error.statusText}`;
          }
        } else if (error.error) {
          errorMessage = error.error;
        }
        
        // Special handling for nested detail objects in ElevenLabs responses
        if (error.details && error.details.detail && typeof error.details.detail === 'object') {
          if (error.details.detail.message) {
            errorMessage = error.details.detail.message;
          } else if (error.details.detail.status) {
            errorMessage = `${error.details.detail.status}: ${error.details.detail.message || 'Unknown error'}`;
          }
        }
        
        throw new Error(`Transcription failed: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Transcription completed successfully');
      return data;
    } catch (error) {
      console.error('Error during transcription:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Convert a Scribe response to caption objects for the editor
   * @param transcription The Scribe API response
   * @param options Configuration options for generating captions
   * @returns Array of Caption objects ready for the editor
   */
  convertToCaptions(
    transcription: ScribeResponse, 
    options: TranscriptionOptions = {}
  ): Caption[] {
    // Merge options with defaults
    const config = { ...DEFAULT_OPTIONS, ...options };
    
    // Filter out spacing words if necessary
    let words = transcription.words;
    if (config.mergeSpacingWords) {
      words = words.filter(word => word.type === 'word');
    }
    
    const captions: Caption[] = [];
    let currentCaption: { text: string; words: ScribeWord[] } = { text: '', words: [] };
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check if we need to create a new caption based on word count
      const wordCountExceeded = config.wordsPerCaption && 
        currentCaption.words.length >= config.wordsPerCaption;
      
      // Check if we need to create a new caption based on character count
      const charCountExceeded = config.charactersPerCaption && 
        (currentCaption.text.length + word.text.length) > config.charactersPerCaption;
      
      // Check if we need to create a new caption based on duration
      const durationExceeded = config.maxDurationPerCaption && 
        currentCaption.words.length > 0 &&
        (word.end - currentCaption.words[0].start) * 1000 > config.maxDurationPerCaption;
      
      // If any threshold is exceeded, create a new caption
      if (currentCaption.words.length > 0 && (wordCountExceeded || charCountExceeded || durationExceeded)) {
        const startWord = currentCaption.words[0];
        const endWord = currentCaption.words[currentCaption.words.length - 1];
        
        // Convert Scribe words to CaptionWords
        const captionWords: CaptionWord[] = currentCaption.words.map(w => ({
          word: w.text,
          startMs: w.start * 1000,
          endMs: w.end * 1000,
          confidence: 1 // Scribe doesn't provide confidence, so default to 1
        }));
        
        // Format the caption text with proper spaces
        const formattedText = currentCaption.words.map(w => w.text).join(' ');
        
        captions.push({
          text: formattedText.trim(),
          startMs: startWord.start * 1000, // convert to ms
          endMs: endWord.end * 1000,       // convert to ms
          timestampMs: startWord.start * 1000,
          confidence: 1,   // Default confidence
          words: captionWords
        });
        
        // Reset for next caption
        currentCaption = { text: '', words: [] };
      }
      
      // Add current word to caption
      currentCaption.text += (currentCaption.text ? ' ' : '') + word.text;
      currentCaption.words.push(word);
    }
    
    // Add the last caption if there's anything left
    if (currentCaption.words.length > 0) {
      const startWord = currentCaption.words[0];
      const endWord = currentCaption.words[currentCaption.words.length - 1];
      
      // Convert Scribe words to CaptionWords
      const captionWords: CaptionWord[] = currentCaption.words.map(w => ({
        word: w.text,
        startMs: w.start * 1000,
        endMs: w.end * 1000,
        confidence: 1 // Scribe doesn't provide confidence, so default to 1
      }));
      
      // Format the caption text with proper spaces
      const formattedText = currentCaption.words.map(w => w.text).join(' ');
      
      captions.push({
        text: formattedText.trim(),
        startMs: startWord.start * 1000,
        endMs: endWord.end * 1000,
        timestampMs: startWord.start * 1000,
        confidence: 1,   // Default confidence
        words: captionWords
      });
    }
    
    return captions;
  },

  /**
   * Process an audio file and convert it directly to captions
   * @param audioFile The audio file to transcribe and convert
   * @param options Configuration options for generating captions
   * @param apiKey Optional ElevenLabs API key to use for the request
   * @returns Promise with array of Caption objects
   */
  async audioToCaptions(
    audioFile: File | Blob, 
    options: TranscriptionOptions = {},
    apiKey?: string
  ): Promise<Caption[]> {
    // Transcribe the audio
    const transcription = await this.transcribeAudio(audioFile, apiKey);
    
    // Convert transcription to captions
    return this.convertToCaptions(transcription, options);
  }
};

export default TranscriptionService; 