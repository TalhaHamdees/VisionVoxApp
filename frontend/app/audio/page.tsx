'use client';

// Debug flag - set to true to enable detailed console logging
const DEBUG = true;

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator, SelectGroup } from '@/components/ui/select';
import { Music, Mic, Upload, Loader2, Play, Pause, Download, Volume2, FileText, Wand2, Search, Heart, Filter, X, Check, Users2, Globe, CalendarDays, Tags, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import { Progress } from '@/components/ui/progress';
import { storeAudioFile } from '@/lib/indexed-db';

// Custom SelectItem without the default indicator
const CustomSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
CustomSelectItem.displayName = "CustomSelectItem";

export default function AudioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [text, setText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [style, setStyle] = useState(0.0);
  const [removeSilence, setRemoveSilence] = useState(false);
  const [silenceThreshold, setSilenceThreshold] = useState(0.5);
  const [silenceDetectionLevel, setSilenceDetectionLevel] = useState(-30);
  const [normalizeAudio, setNormalizeAudio] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [playingSample, setPlayingSample] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({
    generated: new Audio()
  }).current;
  const [generationMode, setGenerationMode] = useState<'default' | 'crisp'>('default');
  const [voices, setVoices] = useState<Array<{
    voice_id: string;
    name: string;
    preview_url: string;
    description?: string;
    category?: string;
    gender?: string;
    accent?: string;
    age?: string;
    use_case?: string;
    isFavorite?: boolean;
  }>>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // New state for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<{
    gender: string[];
    accent: string[];
    age: string[];
    category: string[];
  }>({
    gender: [],
    accent: [],
    age: [],
    category: []
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Filter options
  const filterOptions = {
    gender: ['male', 'female', 'other'],
    accent: ['american', 'british', 'indian', 'australian', 'african', 'european', 'neutral'],
    age: ['child', 'young', 'adult', 'elderly'],
    category: ['premade', 'cloned', 'generated']
  };

  // Debug configuration
  const debugConfig = {
    enabled: true,
    apiUrl: process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001/api/audio'
  };

  // Debug function to log important events
  const debugLog = (...args: any[]) => {
    if (DEBUG) {
      console.log(`[AudioPage Debug]`, ...args);
    }
  };
  
  // Log initial state
  useEffect(() => {
    debugLog('Component mounted', { 
      user: user ? 'Logged in' : 'Not logged in', 
      loading, 
      apiUrl: process.env.NEXT_PUBLIC_AUDIO_API_URL || '/api/audio'
    });
  }, [user, loading]);

  // Debug voices when they change
  useEffect(() => {
    console.log('Voices state updated:', voices);
  }, [voices]);

  // Update timer for audio playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && audioRefs['generated']) {
      interval = setInterval(() => {
        setCurrentTime(audioRefs['generated'].currentTime);
        setDuration(audioRefs['generated'].duration || 0);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, audioRefs]);

  // Load favorites from localStorage on initial load
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('audioFavorites');
      if (savedFavorites) {
        const parsedFavorites = JSON.parse(savedFavorites);
        if (Array.isArray(parsedFavorites)) {
          setFavorites(parsedFavorites);
          debugLog('Loaded favorites from localStorage', parsedFavorites);
        }
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    }
  }, []);

  // Update voices with favorite status
  useEffect(() => {
    if (voices.length > 0 && favorites.length > 0) {
      // Create a new array only if the favorite status has actually changed
      const needsUpdate = voices.some(voice => 
        favorites.includes(voice.voice_id) !== voice.isFavorite
      );
      
      if (needsUpdate) {
        debugLog('Updating voices with favorite status', { 
          favoritesCount: favorites.length, 
          voicesCount: voices.length 
        });
        const updatedVoices = voices.map(voice => ({
          ...voice,
          isFavorite: favorites.includes(voice.voice_id)
        }));
        setVoices(updatedVoices);
      }
    }
  }, [favorites]);

  // Fetch voices from the backend
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setIsLoadingVoices(true);
        const AUDIO_API_URL = process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001/api/audio';
        const response = await fetch(`${AUDIO_API_URL}/voices`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }
        
        const voicesData = await response.json();
        console.log('Fetched voices:', voicesData);
        
        // If no voices returned or empty array, use fallback voices
        if (!voicesData || voicesData.length === 0) {
          console.warn('No voices returned from API, using fallback voices');
          const fallbackVoices = [
            { 
              voice_id: 'JBFqnCBsd6RMkjVDRZzb', 
              name: 'George', 
              preview_url: 'https://elevenlabs.io/audio/ejJUMKpNu9mBQEXBmYG3.mp3',
              description: 'A deep authoritative male voice with a British accent',
              gender: 'male',
              accent: 'british',
              age: 'middle-aged',
              category: 'premade'
            },
            { 
              voice_id: '21m00Tcm4TlvDq8ikWAM', 
              name: 'Rachel', 
              preview_url: 'https://elevenlabs.io/audio/ejJUMKpNu9mBQEXBmYG3.mp3',
              description: 'A professional female voice with a neutral accent',
              gender: 'female',
              accent: 'neutral',
              age: 'adult',
              category: 'premade'
            },
            { 
              voice_id: 'EXAVITQu4vr4xnSDxMaL', 
              name: 'Bella', 
              preview_url: 'https://elevenlabs.io/audio/ejJUMKpNu9mBQEXBmYG3.mp3',
              description: 'A friendly female voice with a warm tone',
              gender: 'female',
              accent: 'american',
              age: 'young',
              category: 'premade'
            },
            { 
              voice_id: 'VR6AewLTigWG4xSOukaG', 
              name: 'Adam', 
              preview_url: 'https://elevenlabs.io/audio/ejJUMKpNu9mBQEXBmYG3.mp3',
              description: 'A deep male voice with a professional tone',
              gender: 'male',
              accent: 'british',
              age: 'adult',
              category: 'premade'
            },
            { 
              voice_id: 'pNInz6obpgDQGcFmaJgB', 
              name: 'Josh', 
              preview_url: 'https://elevenlabs.io/audio/ejJUMKpNu9mBQEXBmYG3.mp3',
              description: 'A casual male voice with a conversational style',
              gender: 'male',
              accent: 'american',
              age: 'young',
              category: 'premade'
            },
            { 
              voice_id: 'flq6f7yk4E4fJM5XTYuZ', 
              name: 'Elli', 
              preview_url: 'https://elevenlabs.io/audio/ejJUMKpNu9mBQEXBmYG3.mp3',
              description: 'A child-like voice with a playful tone',
              gender: 'female',
              accent: 'neutral',
              age: 'young',
              category: 'premade'
            }
          ];
          
          // Mark favorites
          const voicesWithFavorites = fallbackVoices.map(voice => ({
            ...voice,
            isFavorite: favorites.includes(voice.voice_id)
          }));
          
          setVoices(voicesWithFavorites);
        } else {
          // Mark favorites in the fetched voices
          const voicesWithFavorites = voicesData.map((voice: any) => ({
            ...voice,
            isFavorite: favorites.includes(voice.voice_id)
          }));
          setVoices(voicesWithFavorites);
        }
        
        setIsLoadingVoices(false);
      } catch (error) {
        console.error('Error fetching voices:', error);
        setIsLoadingVoices(false);
        
        toast({
          title: "Error",
          description: "Failed to load voices. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    fetchVoices();
  }, [favorites]);

  // Calculate word count whenever text changes
  useEffect(() => {
    // Count words by splitting on whitespace and filtering out empty strings
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [text]);

  // Filter voices based on search query and active filters
  const getFilteredVoices = () => {
    return voices.filter(voice => {
      // Filter by search query
      const matchesSearch = !searchQuery || 
        voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (voice.description && voice.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by favorites
      const matchesFavorites = !showFavoritesOnly || voice.isFavorite;
      
      // Filter by other filters
      const matchesGender = activeFilters.gender.length === 0 || 
        (voice.gender && activeFilters.gender.includes(voice.gender));
      
      const matchesAccent = activeFilters.accent.length === 0 || 
        (voice.accent && activeFilters.accent.includes(voice.accent));
      
      const matchesAge = activeFilters.age.length === 0 || 
        (voice.age && activeFilters.age.includes(voice.age));
      
      const matchesCategory = activeFilters.category.length === 0 || 
        (voice.category && activeFilters.category.includes(voice.category));
      
      return matchesSearch && matchesFavorites && matchesGender && 
        matchesAccent && matchesAge && matchesCategory;
    });
  };
  
  // Toggle filter
  const toggleFilter = (type: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const current = [...prev[type]];
      const index = current.indexOf(value);
      
      if (index === -1) {
        current.push(value);
      } else {
        current.splice(index, 1);
      }
      
      return {
        ...prev,
        [type]: current
      };
    });
  };
  
  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({
      gender: [],
      accent: [],
      age: [],
      category: []
    });
    setSearchQuery('');
    setShowFavoritesOnly(false);
  };

  // Function to play voice sample
  const playVoiceSample = (voiceId: string) => {
    debugLog('Playing voice sample', voiceId);
    
    // If this sample is already playing, stop it
    if (playingSample === voiceId) {
      const sampleAudio = document.getElementById(`sample-${voiceId}`) as HTMLAudioElement;
      if (sampleAudio) {
        sampleAudio.pause();
        sampleAudio.currentTime = 0;
      }
      setPlayingSample(null);
      return;
    }
    
    // Stop any currently playing sample
    if (playingSample) {
      const currentSample = document.getElementById(`sample-${playingSample}`) as HTMLAudioElement;
      if (currentSample) {
        currentSample.pause();
        currentSample.currentTime = 0;
      }
    }
    
    // Stop the main generated audio if it's playing
    if (isPlaying && audioRefs['generated']) {
      audioRefs['generated'].pause();
      setIsPlaying(false);
    }
    
    // Play the new sample
    const sampleAudio = document.getElementById(`sample-${voiceId}`) as HTMLAudioElement;
    if (sampleAudio) {
      sampleAudio.play().catch(error => {
        debugLog('Error playing sample', error);
      });
      setPlayingSample(voiceId);
      
      // Auto-stop when sample ends
      sampleAudio.onended = () => {
        setPlayingSample(null);
      };
    }
  };

  // Add state for tracking crisp generation progress
  const [crispProgress, setCrispProgress] = useState<{ current: number; total: number } | null>(null);

  // Add a function to stop all audio playback
  const stopAllAudio = () => {
    debugLog('Stopping all audio playback');
    
    // Stop the main generated audio
    if (audioRefs['generated']) {
      audioRefs['generated'].pause();
      audioRefs['generated'].currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
    
    // Clear any sample audio that might be playing
    if (playingSample) {
      const sampleAudio = document.getElementById(`sample-${playingSample}`) as HTMLAudioElement;
      if (sampleAudio) {
        sampleAudio.pause();
        sampleAudio.currentTime = 0;
        setPlayingSample(null);
      }
    }
  };

  // Function to handle audio generation based on selected mode
  const handleGenerateAudio = async () => {
    debugLog('Generating audio with mode:', generationMode);
    
    // Stop all audio playback
    stopAllAudio();
    
    // Reset progress state
    setCrispProgress(null);
    
    if (generationMode === 'default') {
      await generateDefaultAudio();
    } else if (generationMode === 'crisp') {
      await generateCrispVoiceover();
    }
  };

  // Function for default audio generation (simple generation without any special processing)
  const generateDefaultAudio = async () => {
    if (!text) {
      debugLog('No text provided, aborting generation');
      toast({
        title: "Text Required",
        description: "Please enter some text to generate audio.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user) {
      debugLog('User not logged in, redirecting to login');
      router.push('/login');
      return;
    }
    
    if (!selectedVoice) {
      debugLog('No voice selected, showing error');
      toast({
        title: "Voice Required",
        description: "Please select a voice to generate audio.",
        variant: "destructive"
      });
      return;
    }
    
    // Make sure any currently playing audio is stopped before generating new audio
    if (audioRefs['generated']) {
      audioRefs['generated'].pause();
      audioRefs['generated'].currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
    
    // Clear any sample audio that might be playing
    if (playingSample) {
      const sampleAudio = document.getElementById(`sample-${playingSample}`) as HTMLAudioElement;
      if (sampleAudio) {
        sampleAudio.pause();
        sampleAudio.currentTime = 0;
        setPlayingSample(null);
      }
    }
    
    setIsGenerating(true);
    
    debugLog('Starting audio generation', { 
      textLength: text.length,
      selectedVoice,
      settings: { stability, similarityBoost, style }
    });
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('text', text);
      formData.append('voice_id', selectedVoice);
      formData.append('model_id', 'eleven_multilingual_v2');
      
      // Use the slider values from UI state
      formData.append('stability', stability.toString());
      formData.append('similarity_boost', similarityBoost.toString());
      formData.append('style', style.toString());
      formData.append('use_speaker_boost', 'true');
      
      // Add default values for speed and pitch
      formData.append('speed', '1.0');
      formData.append('pitch', '1.0');
      
      // Add toggle settings
      formData.append('remove_silence', removeSilence.toString());
      formData.append('silence_threshold', silenceThreshold.toString());
      formData.append('silence_detection_level', silenceDetectionLevel.toString());
      formData.append('normalize_audio', normalizeAudio.toString());
      
      formData.append('output_format', 'mp3_44100_128');
      
      debugLog('Form data prepared', {
        voice_id: selectedVoice,
        model_id: 'eleven_multilingual_v2',
        text_length: text.length,
        stability,
        similarity_boost: similarityBoost,
        style
      });
      
      // Call the backend API
      const AUDIO_API_URL = process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001/api/audio';
      const endpoint = `${AUDIO_API_URL}/generate`;
      debugLog('Sending request to', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      debugLog('Response received', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        debugLog('Error response', errorText);
        throw new Error(`Failed to generate audio: ${response.statusText}`);
      }
      
      const data = await response.json();
      debugLog('Success response', data);
      
      if (data.audio_url) {
        debugLog('Audio URL received', data.audio_url);
        
        // Make sure the URL is absolute
        let audioUrl = data.audio_url;
        
        if (!audioUrl.startsWith('http')) {
          // Use the same base URL as the API
          const baseUrl = process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001';
          // Remove /api/audio from the base URL if it's included
          const baseUrlWithoutPath = baseUrl.endsWith('/api/audio') 
            ? baseUrl.substring(0, baseUrl.length - '/api/audio'.length)
            : baseUrl;
          
          audioUrl = `${baseUrlWithoutPath}${audioUrl}`;
          debugLog('Converted to absolute URL', audioUrl);
        }
        
        // Create audio element for the generated audio
        const audioElement = new Audio(audioUrl);
        
        // Apply speed directly to the audio element for client-side playback adjustment
        audioElement.playbackRate = 1.0;
        
        // Preload the audio
        audioElement.preload = 'auto';
        
        // Add event listeners
        audioElement.addEventListener('loadedmetadata', () => {
          debugLog('Audio loaded metadata', { 
            duration: audioElement.duration,
            src: audioElement.src
          });
          setDuration(audioElement.duration);
        });
        
        audioElement.addEventListener('error', (e) => {
          debugLog('Audio element error', { 
            error: e,
            code: audioElement.error?.code,
            message: audioElement.error?.message
          });
          toast({
            title: "Audio Error",
            description: `Failed to load audio: ${audioElement.error?.message || 'Unknown error'}`,
            variant: "destructive"
          });
        });
        
        audioElement.addEventListener('ended', () => {
          debugLog('Audio playback ended');
          setIsPlaying(false);
        });
        
        audioElement.addEventListener('timeupdate', () => {
          setCurrentTime(audioElement.currentTime);
        });
        
        // Store the audio element
        audioRefs['generated'] = audioElement;
        setHasAudio(true);
        debugLog('Audio state updated', { hasAudio: true });
        
        // Preload the audio
        audioElement.load();
        
        // Wait a small delay to ensure the audio is loaded before playing
        setTimeout(() => {
          // Use the audioRefs directly instead of checking hasAudio state
          if (audioRefs['generated'] && audioRefs['generated'].src) {
            debugLog('Attempting to play audio after short delay');
            // Call play directly on the audio element
            audioRefs['generated'].play()
              .then(() => {
                setIsPlaying(true);
                debugLog('Audio playback started successfully');
              })
              .catch(err => {
                debugLog('Error playing audio after generation', err);
                if (err.name !== 'AbortError') {
                  toast({
                    title: "Playback Error",
                    description: "Could not auto-play audio. Please click play manually.",
                    variant: "destructive"
                  });
                }
              });
          }
        }, 500);
      } else {
        debugLog('No audio URL in response', data);
        throw new Error('No audio URL returned from the server');
      }
    } catch (error: any) {
      debugLog('Error generating audio', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      debugLog('Generation process completed', { hasAudio });
    }
  };

  // Also modify the crisp voiceover generation to auto-play after generation
  const generateCrispVoiceover = async () => {
    if (!text) {
      debugLog('No text provided, aborting generation');
      toast({
        title: "Text Required",
        description: "Please enter some text to generate audio.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user) {
      debugLog('User not logged in, redirecting to login');
      router.push('/login');
      return;
    }
    
    debugLog('Starting crisp voiceover generation', { 
      textLength: text.length,
      selectedVoice,
      settings: { stability, similarityBoost, style }
    });
    
    // Make sure any currently playing audio is stopped before generating new audio
    if (audioRefs['generated']) {
      audioRefs['generated'].pause();
      audioRefs['generated'].currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
    
    // Clear any sample audio that might be playing
    if (playingSample) {
      const sampleAudio = document.getElementById(`sample-${playingSample}`) as HTMLAudioElement;
      if (sampleAudio) {
        sampleAudio.pause();
        sampleAudio.currentTime = 0;
        setPlayingSample(null);
      }
    }
    
    setIsGenerating(true);
    
    try {
      // Split text into words
      const words = text.split(/\s+/);
      const wordCount = words.length;
      
      debugLog('Text analysis', { wordCount });
      
      // If less than 60 words, use regular generation
      if (wordCount <= 60) {
        debugLog('Text is short enough for regular generation');
        await generateDefaultAudio();
        return;
      }
      
      // Otherwise, split into chunks of approximately 60 words
      const chunkSize = 60;
      const chunks = [];
      
      for (let i = 0; i < wordCount; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        chunks.push(chunk);
      }
      
      debugLog('Split text into chunks', { 
        chunkCount: chunks.length, 
        chunks: chunks.map(c => ({ length: c.length, wordCount: c.split(/\s+/).length }))
      });
      
      // Initialize progress tracking
      setCrispProgress({ current: 0, total: chunks.length });
      
      // Generate audio for each chunk
      const audioUrls = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Update progress
        setCrispProgress({ current: i, total: chunks.length });
        
        // Create form data for this chunk
        const formData = new FormData();
        formData.append('text', chunk);
        formData.append('voice_id', selectedVoice);
        formData.append('model_id', 'eleven_multilingual_v2');
        formData.append('stability', stability.toString());
        formData.append('similarity_boost', similarityBoost.toString());
        formData.append('style', style.toString());
        formData.append('use_speaker_boost', 'true');
        formData.append('speed', '1.0');
        formData.append('pitch', '1.0');
        formData.append('remove_silence', removeSilence.toString());
        formData.append('silence_threshold', silenceThreshold.toString());
        formData.append('silence_detection_level', silenceDetectionLevel.toString());
        formData.append('normalize_audio', normalizeAudio.toString());
        formData.append('output_format', 'mp3_44100_128');
        formData.append('is_chunk', 'true');
        formData.append('chunk_index', i.toString());
        formData.append('total_chunks', chunks.length.toString());
        
        // Call the backend API for this chunk
        const AUDIO_API_URL = process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001/api/audio';
        const endpoint = `${AUDIO_API_URL}/generate`;
        
        debugLog('Sending chunk request', { 
          chunkIndex: i, 
          chunkLength: chunk.length,
          endpoint 
        });
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          debugLog('Error response for chunk', { chunkIndex: i, error: errorText });
          throw new Error(`Failed to generate audio for chunk ${i + 1}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.audio_url) {
          // Make sure the URL is absolute
          let audioUrl = data.audio_url;
          
          if (!audioUrl.startsWith('http')) {
            const baseUrl = process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001';
            const baseUrlWithoutPath = baseUrl.endsWith('/api/audio') 
              ? baseUrl.substring(0, baseUrl.length - '/api/audio'.length)
              : baseUrl;
            
            audioUrl = `${baseUrlWithoutPath}${audioUrl}`;
          }
          
          audioUrls.push(audioUrl);
          debugLog('Added chunk audio URL', { chunkIndex: i, audioUrl });
        } else {
          throw new Error(`No audio URL returned for chunk ${i + 1}`);
        }
      }
      
      // Update progress for merging phase
      setCrispProgress({ current: chunks.length, total: chunks.length + 1 });
      
      // Now merge all chunks
      const AUDIO_API_URL = process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001/api/audio';
      const mergeEndpoint = `${AUDIO_API_URL}/merge`;
      
      debugLog('Sending merge request', { 
        chunkCount: audioUrls.length,
        mergeEndpoint 
      });
      
      const mergeResponse = await fetch(mergeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrls: audioUrls,
          voiceId: selectedVoice,
        }),
      });
      
      if (!mergeResponse.ok) {
        const errorText = await mergeResponse.text();
        debugLog('Error response for merge', errorText);
        throw new Error(`Failed to merge audio chunks: ${mergeResponse.statusText}`);
      }
      
      const mergeData = await mergeResponse.json();
      
      if (mergeData.url) {
        // Make sure the URL is absolute
        let audioUrl = mergeData.url;
        
        if (!audioUrl.startsWith('http')) {
          const baseUrl = process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001';
          const baseUrlWithoutPath = baseUrl.endsWith('/api/audio') 
            ? baseUrl.substring(0, baseUrl.length - '/api/audio'.length)
            : baseUrl;
          
          audioUrl = `${baseUrlWithoutPath}${audioUrl}`;
        }
        
        debugLog('Final merged audio URL', audioUrl);
        
        // Create audio element for the generated audio
        const audioElement = new Audio(audioUrl);
        
        // Apply speed directly to the audio element for client-side playback adjustment
        audioElement.playbackRate = 1.0;
        
        // Preload the audio
        audioElement.preload = 'auto';
        
        // Add event listeners
        audioElement.addEventListener('loadedmetadata', () => {
          debugLog('Audio loaded metadata', { 
            duration: audioElement.duration,
            src: audioElement.src
          });
          setDuration(audioElement.duration);
        });
        
        audioElement.addEventListener('error', (e) => {
          debugLog('Audio element error', { 
            error: e,
            code: audioElement.error?.code,
            message: audioElement.error?.message
          });
          toast({
            title: "Audio Error",
            description: `Failed to load audio: ${audioElement.error?.message || 'Unknown error'}`,
            variant: "destructive"
          });
        });
        
        audioElement.addEventListener('ended', () => {
          debugLog('Audio playback ended');
          setIsPlaying(false);
        });
        
        audioElement.addEventListener('timeupdate', () => {
          setCurrentTime(audioElement.currentTime);
        });
        
        // Store the audio element
        audioRefs['generated'] = audioElement;
        setHasAudio(true);
        
        // Preload the audio
        audioElement.load();
        
        // Wait a small delay to ensure the audio is loaded before playing
        setTimeout(() => {
          // Use the audioRefs directly instead of checking hasAudio state
          if (audioRefs['generated'] && audioRefs['generated'].src) {
            debugLog('Attempting to play audio after short delay');
            // Call play directly on the audio element
            audioRefs['generated'].play()
              .then(() => {
                setIsPlaying(true);
                debugLog('Audio playback started successfully');
              })
              .catch(err => {
                debugLog('Error playing audio after generation', err);
                if (err.name !== 'AbortError') {
                  toast({
                    title: "Playback Error",
                    description: "Could not auto-play audio. Please click play manually.",
                    variant: "destructive"
                  });
                }
              });
          }
        }, 500);
      } else {
        debugLog('No merged audio URL in response', mergeData);
        throw new Error('No merged audio URL returned from the server');
      }
    } catch (error: any) {
      debugLog('Error generating crisp voiceover', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate crisp voiceover. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setCrispProgress(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const togglePlayback = () => {
    debugLog('Toggle playback called', { isPlaying, hasAudio });
    
    // Check audioRefs directly instead of hasAudio state
    if (!audioRefs['generated'] || !audioRefs['generated'].src) {
      debugLog('No audio source available to play');
      toast({
        title: "No Audio",
        description: "Please generate audio first.",
        variant: "destructive"
      });
      return;
    }
    
    // Stop any sample audio that might be playing
    if (playingSample) {
      const sampleAudio = document.getElementById(`sample-${playingSample}`) as HTMLAudioElement;
      if (sampleAudio) {
        sampleAudio.pause();
        sampleAudio.currentTime = 0;
        setPlayingSample(null);
      }
    }
    
    if (isPlaying) {
      debugLog('Pausing audio');
      audioRefs['generated'].pause();
      setIsPlaying(false);
    } else {
      debugLog('Playing audio');
      
      // Try to play the audio with better error handling
      audioRefs['generated'].play().then(() => {
        debugLog('Audio playback started successfully');
        setIsPlaying(true);
      }).catch(err => {
        debugLog('Error playing audio', err);
        
        // Check for specific error types
        if (err.name === 'AbortError') {
          debugLog('Audio playback was aborted, likely due to new audio generation');
          // This is expected when generating new audio, so don't show an error toast
          return;
        }
        
        // For other errors, show a toast
        toast({
          title: "Playback Error",
          description: err.message || "Failed to play audio.",
          variant: "destructive"
        });
      });
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (voiceId: string) => {
    debugLog('Toggle favorite called', { voiceId, currentFavorites: favorites });
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save favorites",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const isFavorite = favorites.includes(voiceId);
      debugLog('Current favorite status', { voiceId, isFavorite });
      
      // Update favorites state
      let newFavorites;
      if (isFavorite) {
        debugLog('Removing from favorites', voiceId);
        newFavorites = favorites.filter(id => id !== voiceId);
      } else {
        debugLog('Adding to favorites', voiceId);
        newFavorites = [...favorites, voiceId];
      }
      
      // Update state
      setFavorites(newFavorites);
      
      // Save to localStorage
      localStorage.setItem('audioFavorites', JSON.stringify(newFavorites));
      
      // Update the isFavorite property in the voices array
      setVoices(prevVoices => 
        prevVoices.map(voice => 
          voice.voice_id === voiceId 
            ? { ...voice, isFavorite: !isFavorite } 
            : voice
        )
      );
      
      toast({
        title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
        description: `Voice has been ${isFavorite ? 'removed from' : 'added to'} your favorites`,
      });
    } catch (error) {
      console.error('Error updating favorites:', error);
      
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Set page title
  useEffect(() => {
    const pageTitleEvent = new CustomEvent('updatePageTitle', {
      detail: {
        badge: 'Audio',
        title: 'Audio Generator & Enhancer',
        description: 'Generate AI voiceovers and enhance audio quality',
        extraContent: (
          <div className="text-xs text-muted-foreground">
            <p>Voices loaded: {voices.length}</p>
            <p>Loading state: {isLoadingVoices ? 'Loading...' : 'Done'}</p>
          </div>
        )
      }
    });
    window.dispatchEvent(pageTitleEvent);
  }, [voices.length, isLoadingVoices]);

  // Also update the cleanup effect to use stopAllAudio
  useEffect(() => {
    // Cleanup function to stop audio when component unmounts
    return () => {
      debugLog('Component unmounting, stopping all audio');
      stopAllAudio();
    };
  }, []);

  // Add state for script title
  const [scriptTitle, setScriptTitle] = useState('');

  // Function to move audio to video editor
  const moveToVideoEditor = async () => {
    if (!audioRefs['generated']?.src) {
      toast({
        title: "No Audio Available",
        description: "Please generate audio first.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      debugLog('Moving audio to video editor');
      
      // Create a blob from the audio source
      const response = await fetch(audioRefs['generated'].src);
      const blob = await response.blob();
      
      // Use script title for naming if available, otherwise fall back to first line
      let fileName = '';
      
      if (scriptTitle && scriptTitle.trim() !== '') {
        // Use script title if available
        fileName = scriptTitle.substring(0, 50).replace(/[\\/:*?"<>|]/g, '_');
      } else {
        // Fallback to first line logic
        const firstLine = text.split('\n')[0].trim();
        
        if (firstLine && firstLine.length > 0) {
          // Limit to 30 characters and remove any invalid filename characters
          fileName = firstLine.substring(0, 30).replace(/[\\/:*?"<>|]/g, '_');
        } else {
          // Fallback if there's no text or first line is empty
          fileName = `visionvox_voiceover_${Date.now()}`;
        }
      }
      
      // Ensure the filename ends with .mp3
      fileName = `${fileName}.mp3`;
      
      // Create a File object from the blob
      const file = new File([blob], fileName, { type: 'audio/mpeg' });
      
      // Create a unique ID for the audio file
      const audioId = Date.now().toString();
      
      // Store the audio file in IndexedDB for persistence
      await storeAudioFile({
        id: audioId,
        name: fileName,
        blob: blob,
        type: 'audio/mpeg',
        duration: audioRefs['generated'].duration || 0
      });
      
      // Create a temporary URL for immediate use
      const audioFileUrl = URL.createObjectURL(blob);
      
      // Create audio folder in localStorage if it doesn't exist
      const audioFolder = localStorage.getItem('visionvox_audio_folder');
      const audioFiles = audioFolder ? JSON.parse(audioFolder) : [];
      
      // Add the new audio file with a reference to IndexedDB
      audioFiles.push({
        id: audioId,
        name: fileName,
        url: audioFileUrl, // Temporary URL for current session
        type: 'audio/mpeg',
        size: blob.size,
        duration: audioRefs['generated'].duration || 0,
        createdAt: new Date().toISOString(),
        persistent: true // Flag to indicate this is stored in IndexedDB
      });
      
      // Save back to localStorage
      localStorage.setItem('visionvox_audio_folder', JSON.stringify(audioFiles));
      
      // Set flag to add this audio to timeline when editor loads
      localStorage.setItem('visionvox_add_to_timeline', audioId);
      
      // Save the script text to localStorage for the Scripts panel to use
      if (text && text.trim() !== '') {
        // Create a scripts folder in localStorage if it doesn't exist
        const scriptsFolder = localStorage.getItem('visionvox_scripts_folder');
        const scripts = scriptsFolder ? JSON.parse(scriptsFolder) : [];
        
        // Create a new script object
        const scriptObj = {
          id: audioId, // Use the same ID as the audio file for linking
          title: fileName.replace('.mp3', ''), // Remove .mp3 extension
          content: text,
          audioId: audioId, // Reference to the audio file
          createdAt: new Date().toISOString()
        };
        
        // Add the script to the scripts folder
        scripts.push(scriptObj);
        
        // Save back to localStorage
        localStorage.setItem('visionvox_scripts_folder', JSON.stringify(scripts));
        
        // Also set a flag to highlight the script in the Scripts panel
        localStorage.setItem('visionvox_active_script', audioId);
        
        debugLog('Script saved to localStorage for Scripts panel', scriptObj);
      }
      
      // Dispatch a storage event to notify the editor
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'visionvox_audio_folder'
      }));
      
      toast({
        title: "Success",
        description: "Audio moved to video editor. You can now use it in your project.",
        variant: "default"
      });
      
      // Navigate to the video editor
      router.push('/editor');
    } catch (error) {
      debugLog('Error moving audio to video editor:', error);
      toast({
        title: "Error",
        description: "Failed to move audio to video editor.",
        variant: "destructive"
      });
    }
  };

  // Add useEffect to check for script from localStorage
  useEffect(() => {
    // Check for script in localStorage
    if (typeof window !== 'undefined') {
      const scriptFromStorage = window.localStorage.getItem('script_for_audio');
      if (scriptFromStorage && scriptFromStorage.trim() !== '') {
        setText(scriptFromStorage);
        
        // Get the script title if available
        const scriptTitleFromStorage = window.localStorage.getItem('script_title_for_audio');
        if (scriptTitleFromStorage) {
          setScriptTitle(scriptTitleFromStorage);
          // Clear the localStorage after using it
          window.localStorage.removeItem('script_title_for_audio');
        }
        
        // Clear the localStorage after using it
        window.localStorage.removeItem('script_for_audio');
        
        if (DEBUG) {
          console.log('Script loaded from localStorage:', scriptFromStorage);
          console.log('Script title loaded from localStorage:', scriptTitleFromStorage);
        }
        
        // Ensure voices are loaded when navigating from scriptwriting page
        const AUDIO_API_URL = process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001/api/audio';
        fetch(`${AUDIO_API_URL}/voices`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to fetch voices');
            }
            return response.json();
          })
          .then(voicesData => {
            console.log('Fetched voices on navigation:', voicesData);
            
            if (voicesData && voicesData.length > 0) {
              // Mark favorites
              const voicesWithFavorites = voicesData.map((voice: any) => ({
                ...voice,
                isFavorite: favorites.includes(voice.voice_id)
              }));
              setVoices(voicesWithFavorites);
              
              // Set a default voice if none is selected
              if (!selectedVoice) {
                setSelectedVoice(voicesData[0].voice_id);
              }
            }
            setIsLoadingVoices(false);
          })
          .catch(error => {
            console.error('Error fetching voices on navigation:', error);
            setIsLoadingVoices(false);
          });
      }
    }
  }, [favorites, selectedVoice]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-4">
        <Tabs defaultValue="generate" onValueChange={(tab) => {
          // If switching to the browser tab, ensure voices are loaded with favorites
          if (tab === 'browser' && voices.length > 0) {
            // Update the isFavorite property in the voices array based on current favorites
            setVoices(prevVoices => 
              prevVoices.map(voice => ({
                ...voice,
                isFavorite: favorites.includes(voice.voice_id)
              }))
            );
          }
          
          // If switching to the generate tab, ensure we're not filtering voices
          if (tab === 'generate') {
            // Reset any filters that might be active from the browser tab
            setShowFavoritesOnly(false);
            setSearchQuery('');
            
            // Make sure all voices are available in the dropdown
            if (voices.length > 0 && !selectedVoice) {
              // Set a default voice if none is selected
              setSelectedVoice(voices[0].voice_id);
            }
          }
          
          // Update the active tab state
          setActiveTab(tab);
        }}>
          <TabsList className="mb-6">
            <TabsTrigger value="generate">Generate Voiceover</TabsTrigger>
            <TabsTrigger value="enhance">Enhance Audio</TabsTrigger>
            <TabsTrigger value="browser">Voice Browser</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-border/50 shadow-sm">
                <CardHeader className="bg-muted/30">
                  <CardTitle>Script Input</CardTitle>
                  <CardDescription>
                    Enter your script to generate a voiceover
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Enter your script here..."
                      className="min-h-80 resize-none"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex space-x-4">
                        <div>{wordCount} words</div>
                        <div>{text.length} characters</div>
                      </div>
                      <div>
                        {Math.ceil(text.length / 150)} seconds (approx.)
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <Button variant="outline" size="sm" onClick={() => router.push('/scriptwriting')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Import from Script
                      </Button>
                      <div className="space-y-2">
                        <div className="flex items-center justify-end space-x-4">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="generation-mode" className="text-xs">Generation Mode:</Label>
                            <Select
                              value={generationMode}
                              onValueChange={(value) => setGenerationMode(value as 'default' | 'crisp')}
                            >
                              <SelectTrigger id="generation-mode" className="w-[130px] h-8">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">
                                  <div className="flex items-center">
                                    <Music className="h-3.5 w-3.5 mr-2" />
                                    <span>Default</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="crisp">
                                  <div className="flex items-center">
                                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                                    <span>Crisp</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button 
                          className="w-full"
                          onClick={handleGenerateAudio}
                          disabled={!text || isGenerating || !selectedVoice}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Wand2 className="mr-2 h-4 w-4" />
                              Generate
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-border/50 shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center">
                        <Music className="mr-2 h-5 w-5 text-primary" />
                        Voice Settings
                      </CardTitle>
                      <CardDescription>
                        Customize the voice for your audio
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (selectedVoice) {
                          toggleFavorite(selectedVoice);
                        }
                      }}
                    >
                      <Heart 
                        className={`h-5 w-5 ${selectedVoice && voices.find(v => v.voice_id === selectedVoice)?.isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} 
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="voice">Selected Voice</Label>
                      <Select
                        value={selectedVoice}
                        onValueChange={setSelectedVoice}
                      >
                        <SelectTrigger id="voice">
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Favorites</SelectLabel>
                            {voices.filter(voice => voice.isFavorite).map((voice) => (
                              <CustomSelectItem 
                                key={voice.voice_id} 
                                value={voice.voice_id} 
                                className={`${selectedVoice === voice.voice_id ? 'font-medium text-primary' : ''}`}
                              >
                                <span>{voice.name}</span>
                              </CustomSelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>All Voices</SelectLabel>
                            {voices.filter(voice => !voice.isFavorite).map((voice) => (
                              <CustomSelectItem 
                                key={voice.voice_id} 
                                value={voice.voice_id} 
                                className={`${selectedVoice === voice.voice_id ? 'font-medium text-primary' : ''}`}
                              >
                                <span>{voice.name}</span>
                              </CustomSelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {selectedVoice ? 
                          voices.find(v => v.voice_id === selectedVoice)?.description || 'No description available' : 
                          'Select a voice to generate audio'
                        }
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="stability">Stability: {stability.toFixed(2)}</Label>
                      </div>
                      <Slider
                        id="stability"
                        min={0}
                        max={1}
                        step={0.05}
                        value={[stability]}
                        onValueChange={(value) => setStability(value[0])}
                      />
                      <p className="text-xs text-muted-foreground">
                        Lower values make the voice more expressive with more variability
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="similarity">Similarity Boost: {similarityBoost.toFixed(2)}</Label>
                      </div>
                      <Slider
                        id="similarity"
                        min={0}
                        max={1}
                        step={0.05}
                        value={[similarityBoost]}
                        onValueChange={(value) => setSimilarityBoost(value[0])}
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher values make the voice sound more like the original
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="style">Style: {style.toFixed(1)}</Label>
                      </div>
                      <Slider
                        id="style"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[style]}
                        onValueChange={(value) => setStyle(value[0])}
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher values enhance the style of the voice
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="remove-silence" 
                        checked={removeSilence}
                        onCheckedChange={setRemoveSilence}
                      />
                      <Label htmlFor="remove-silence">Remove long pauses</Label>
                    </div>
                    
                    {/* Show silence threshold sliders when remove_silence is enabled */}
                    {removeSilence && (
                      <div className="pl-6 space-y-4 mt-2 border-l-2 border-muted">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="silence-threshold" className="text-sm">Pause Duration: {silenceThreshold.toFixed(2)}s</Label>
                          </div>
                          <Slider
                            id="silence-threshold"
                            min={0.1}
                            max={1.0}
                            step={0.05}
                            value={[silenceThreshold]}
                            onValueChange={(value) => setSilenceThreshold(value[0])}
                          />
                          <p className="text-xs text-muted-foreground">
                            Lower values remove shorter pauses (more aggressive cutting)
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="silence-detection" className="text-sm">Silence Level: {silenceDetectionLevel}dB</Label>
                          </div>
                          <Slider
                            id="silence-detection"
                            min={-50}
                            max={-10}
                            step={1}
                            value={[silenceDetectionLevel]}
                            onValueChange={(value) => setSilenceDetectionLevel(value[0])}
                          />
                          <p className="text-xs text-muted-foreground">
                            Higher values detect quieter sounds as speech (less aggressive cutting)
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="normalize-audio" 
                        checked={normalizeAudio}
                        onCheckedChange={setNormalizeAudio}
                      />
                      <Label htmlFor="normalize-audio">Normalize to 0dB</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {hasAudio && (
              <div className="mt-6">
                <div className="bg-muted/30 rounded-lg p-4">
                  {/* Redesigned audio player on a single line */}
                  <div className="flex items-center space-x-4">
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={togglePlayback}
                      disabled={!hasAudio}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {/* Progress bar and time */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-sm text-foreground">
                          Generated Voiceover
                        </span>
                        <span>
                          {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / 
                          {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-primary transition-all duration-100"
                          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        ></div>
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          value={currentTime}
                          onChange={(e) => {
                            const newTime = parseFloat(e.target.value);
                            if (audioRefs['generated']) {
                              audioRefs['generated'].currentTime = newTime;
                              setCurrentTime(newTime);
                            }
                          }}
                          className="absolute w-full h-2 opacity-0 cursor-pointer"
                          style={{ margin: 0, top: 0 }}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (audioRefs['generated']?.src) {
                          const link = document.createElement('a');
                          link.href = audioRefs['generated'].src;
                          link.download = `visionvox_audio_${Date.now()}.mp3`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={moveToVideoEditor}
                      className="ml-2"
                    >
                      <Music className="mr-2 h-4 w-4" />
                      Use in Video Editor
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="enhance">
            <Card className="border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5 text-primary" />
                  Upload Audio
                </CardTitle>
                <CardDescription>
                  Upload an audio file to enhance its quality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="audio-upload"
                    className="hidden"
                    accept="audio/*"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="audio-upload"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Mic className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">
                      {file ? file.name : 'Drag and drop an audio file here, or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports MP3, WAV, M4A (max 100MB)
                    </p>
                  </label>
                </div>
                
                {file && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch id="noise-reduction" defaultChecked />
                          <Label htmlFor="noise-reduction">Noise Reduction</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="normalize-volume" defaultChecked />
                          <Label htmlFor="normalize-volume">Normalize Volume</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="remove-silence" defaultChecked />
                          <Label htmlFor="remove-silence">Remove Silence</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch id="enhance-clarity" defaultChecked />
                          <Label htmlFor="enhance-clarity">Enhance Clarity</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="eq-voice" defaultChecked />
                          <Label htmlFor="eq-voice">EQ for Voice</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="compress-dynamic" defaultChecked />
                          <Label htmlFor="compress-dynamic">Compress Dynamics</Label>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Wand2 className="mr-2 h-4 w-4" />
                      Enhance Audio
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="browser" className="space-y-4">
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="bg-muted/30">
                <CardTitle>Voice Browser</CardTitle>
                <CardDescription>
                  Browse and select from our library of AI voices
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search voices..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={showFavoritesOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={showFavoritesOnly ? "bg-primary text-primary-foreground" : ""}
                      >
                        <Heart className={`mr-1 h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
                        Favorites
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Filter className="mr-1 h-4 w-4" />
                            Filters
                            {Object.values(activeFilters).some(arr => arr.length > 0) && (
                              <span className="ml-1 flex h-2 w-2 rounded-full bg-primary"></span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Users2 className="mr-2 h-4 w-4" />
                              <span>Gender</span>
                              {activeFilters.gender.length > 0 && (
                                <span className="ml-auto flex h-2 w-2 rounded-full bg-primary"></span>
                              )}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.gender.includes('male')}
                                onCheckedChange={() => toggleFilter('gender', 'male')}
                              >
                                Male
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.gender.includes('female')}
                                onCheckedChange={() => toggleFilter('gender', 'female')}
                              >
                                Female
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.gender.includes('neutral')}
                                onCheckedChange={() => toggleFilter('gender', 'neutral')}
                              >
                                Neutral
                              </DropdownMenuCheckboxItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Globe className="mr-2 h-4 w-4" />
                              <span>Accent</span>
                              {activeFilters.accent.length > 0 && (
                                <span className="ml-auto flex h-2 w-2 rounded-full bg-primary"></span>
                              )}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.accent.includes('american')}
                                onCheckedChange={() => toggleFilter('accent', 'american')}
                              >
                                American
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.accent.includes('british')}
                                onCheckedChange={() => toggleFilter('accent', 'british')}
                              >
                                British
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.accent.includes('australian')}
                                onCheckedChange={() => toggleFilter('accent', 'australian')}
                              >
                                Australian
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.accent.includes('indian')}
                                onCheckedChange={() => toggleFilter('accent', 'indian')}
                              >
                                Indian
                              </DropdownMenuCheckboxItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <CalendarDays className="mr-2 h-4 w-4" />
                              <span>Age</span>
                              {activeFilters.age.length > 0 && (
                                <span className="ml-auto flex h-2 w-2 rounded-full bg-primary"></span>
                              )}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.age.includes('young')}
                                onCheckedChange={() => toggleFilter('age', 'young')}
                              >
                                Young
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.age.includes('middle-aged')}
                                onCheckedChange={() => toggleFilter('age', 'middle-aged')}
                              >
                                Middle-aged
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.age.includes('senior')}
                                onCheckedChange={() => toggleFilter('age', 'senior')}
                              >
                                Senior
                              </DropdownMenuCheckboxItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Tags className="mr-2 h-4 w-4" />
                              <span>Category</span>
                              {activeFilters.category.length > 0 && (
                                <span className="ml-auto flex h-2 w-2 rounded-full bg-primary"></span>
                              )}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.category.includes('professional')}
                                onCheckedChange={() => toggleFilter('category', 'professional')}
                              >
                                Professional
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.category.includes('casual')}
                                onCheckedChange={() => toggleFilter('category', 'casual')}
                              >
                                Casual
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={activeFilters.category.includes('character')}
                                onCheckedChange={() => toggleFilter('category', 'character')}
                              >
                                Character
                              </DropdownMenuCheckboxItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={clearFilters}>
                            <X className="mr-2 h-4 w-4" />
                            Clear all filters
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {isLoadingVoices ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                      <p className="text-muted-foreground">Loading voices...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getFilteredVoices().map((voice) => (
                        <div 
                          key={voice.voice_id} 
                          className={`relative rounded-lg border p-4 hover:border-primary/50 transition-colors ${
                            selectedVoice === voice.voice_id ? 'border-primary bg-primary/5' : 'border-border/50'
                          }`}
                        >
                          <div className="absolute top-3 right-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(voice.voice_id);
                              }}
                            >
                              <Heart 
                                className={`h-4 w-4 ${voice.isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} 
                              />
                            </Button>
                          </div>
                          <div className="flex flex-col h-full">
                            <div className="mb-2">
                              <h3 className="font-medium">{voice.name}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{voice.description || 'No description available'}</p>
                            </div>
                            <div className="flex flex-wrap gap-1 my-2">
                              {voice.gender && (
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                                  {voice.gender}
                                </span>
                              )}
                              {voice.accent && (
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                                  {voice.accent}
                                </span>
                              )}
                              {voice.category && (
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                                  {voice.category}
                                </span>
                              )}
                            </div>
                            <div className="mt-auto pt-2 flex justify-between items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playVoiceSample(voice.voice_id);
                                }}
                              >
                                {playingSample === voice.voice_id ? (
                                  <>
                                    <Pause className="mr-1 h-3 w-3" />
                                    Stop
                                  </>
                                ) : (
                                  <>
                                    <Play className="mr-1 h-3 w-3" />
                                    Sample
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="text-xs"
                                onClick={() => setSelectedVoice(voice.voice_id)}
                              >
                                <Check className={`mr-1 h-3 w-3 ${selectedVoice === voice.voice_id ? 'opacity-100' : 'opacity-0'}`} />
                                {selectedVoice === voice.voice_id ? 'Selected' : 'Select'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add this progress bar section */}
      {crispProgress && (
        <div className="w-full mt-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Generating Crisp Voiceover: {crispProgress.current} of {crispProgress.total} 
              {crispProgress.current === crispProgress.total ? " (Merging...)" : ""}
            </span>
            <span className="text-sm font-medium">
              {Math.round((crispProgress.current / (crispProgress.total + 1)) * 100)}%
            </span>
          </div>
          <Progress 
            value={crispProgress ? (crispProgress.current / (crispProgress.total + 1)) * 100 : 0} 
            className="h-2 w-full"
          />
        </div>
      )}
    </DashboardLayout>
  );
} 