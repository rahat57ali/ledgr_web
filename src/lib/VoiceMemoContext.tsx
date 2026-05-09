import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { 
  AudioModule, useAudioRecorder, RecordingPresets, createAudioPlayer, AudioPlayer,
  getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync
} from 'expo-audio';
import { VoiceMemo } from './store';

const STORAGE_KEY = 'ledgr_voice_memos';
const MEMO_DIR = `${FileSystem.documentDirectory || ''}voice_memos/`;
const MAX_DURATION_MS = 180000; // 3 minutes

interface VoiceMemoContextType {
  memos: VoiceMemo[];
  isLoaded: boolean;
  isRecording: boolean;
  recordingDuration: number;
  currentlyPlayingId: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  playMemo: (memoId: string) => Promise<void>;
  pauseMemo: () => Promise<void>;
  deleteMemo: (memoId: string) => Promise<void>;
  clearAllMemos: () => Promise<void>;
  getStorageSize: () => Promise<number>;
  requestPermissions: () => Promise<boolean>;
}

const VoiceMemoContext = createContext<VoiceMemoContextType | undefined>(undefined);

export const VoiceMemoProvider = ({ children }: { children: ReactNode }) => {
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playerRef = useRef<AudioPlayer | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isUserHoldingRef = useRef(false);
  const recordingStartTimeRef = useRef(0);

  // Initialize
  useEffect(() => {
    (async () => {
      // Create directory
      const dirInfo = await FileSystem.getInfoAsync(MEMO_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MEMO_DIR, { intermediates: true });
      }

      // Load memos
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setMemos(JSON.parse(raw));
      }
      setIsLoaded(true);

      // Check permissions
      const status = await getRecordingPermissionsAsync();
      setPermissionStatus(status.status as any);
    })();

    // AppState listener for interruptions
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (playerRef.current) {
        playerRef.current.remove();
      }
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      if (audioRecorder.isRecording) {
        stopRecording();
      }
    }
    appState.current = nextAppState;
  };

  const requestPermissions = async () => {
    const status = await requestRecordingPermissionsAsync();
    setPermissionStatus(status.status as any);
    return status.granted;
  };

  const startRecording = async () => {
    try {
      isUserHoldingRef.current = true;
      if (permissionStatus !== 'granted') {
        const granted = await requestPermissions();
        if (!granted) {
          isUserHoldingRef.current = false;
          return;
        }
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      try {
        await audioRecorder.prepareToRecordAsync();
      } catch (prepareErr) {
        console.error('Failed to prepare recorder', prepareErr);
        isUserHoldingRef.current = false;
        return;
      }

      // If user released while we were initializing, stop immediately
      if (!isUserHoldingRef.current) {
        return;
      }

      try {
        await audioRecorder.record();
      } catch (recordErr) {
        console.error('Failed to start recording on native device', recordErr);
        isUserHoldingRef.current = false;
        return;
      }
      setIsRecording(true);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now();

      durationIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - recordingStartTimeRef.current;
        setRecordingDuration(elapsed);

        if (elapsed >= MAX_DURATION_MS) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      isUserHoldingRef.current = false;
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    isUserHoldingRef.current = false;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      let uri = null;
      try {
        if (audioRecorder.isRecording) {
          await audioRecorder.stop();
        }
        uri = audioRecorder.uri;
      } catch (nativeErr) {
        console.warn('Native recorder stop/uri access failed', nativeErr);
      }
      
      setIsRecording(false);

      if (uri) {
        const timestamp = Date.now();
        const filename = `memo_${timestamp}.m4a`;
        const destUri = MEMO_DIR + filename;
        await FileSystem.moveAsync({ from: uri, to: destUri });

        const finalDurationMs = timestamp - recordingStartTimeRef.current;

        const newMemo: VoiceMemo = {
          id: timestamp.toString(),
          uri: destUri,
          durationMs: finalDurationMs > 0 ? finalDurationMs : 1000,
          createdAt: new Date(timestamp).toISOString(),
        };

        setMemos(prev => {
          const updated = [newMemo, ...prev];
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(e => 
            console.error('Failed to save memos to storage', e)
          );
          return updated;
        });
      }

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsRecording(false);
    }
  };

  const playMemo = async (memoId: string) => {
    if (playCheckIntervalRef.current) {
        clearInterval(playCheckIntervalRef.current);
    }

    // Stop current playback if any
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.remove();
      playerRef.current = null;
    }

    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;

    try {
      const player = createAudioPlayer(memo.uri);
      playerRef.current = player;
      setCurrentlyPlayingId(memoId);

      player.play();

      playCheckIntervalRef.current = setInterval(() => {
          if (playerRef.current === player) {
              if (!player.playing) {
                  setCurrentlyPlayingId(null);
                  if (playCheckIntervalRef.current) clearInterval(playCheckIntervalRef.current);
              }
          } else {
              if (playCheckIntervalRef.current) clearInterval(playCheckIntervalRef.current);
          }
      }, 500);

    } catch (err) {
      console.error('Failed to play memo', err);
    }
  };

  const pauseMemo = async () => {
    if (playerRef.current) {
      playerRef.current.pause();
      setCurrentlyPlayingId(null);
    }
  };

  const deleteMemo = async (memoId: string) => {
    const memo = memos.find(m => m.id === memoId);
    if (memo) {
      try {
        await FileSystem.deleteAsync(memo.uri, { idempotent: true });
      } catch (e) {
        console.error('Failed to delete memo file', e);
      }
    }
    const updated = memos.filter(m => m.id !== memoId);
    setMemos(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAllMemos = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(MEMO_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(MEMO_DIR, { idempotent: true });
        await FileSystem.makeDirectoryAsync(MEMO_DIR, { intermediates: true });
      }
    } catch (e) {
      console.error('Failed to clear memo directory', e);
    }
    setMemos([]);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  };

  const getStorageSize = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(MEMO_DIR);
      if (!dirInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(MEMO_DIR);
      let totalSize = 0;
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(MEMO_DIR + file);
        if (fileInfo.exists) {
          totalSize += (fileInfo as any).size || 0;
        }
      }
      return totalSize;
    } catch (e) {
      console.error('Failed to get memo storage size', e);
      return 0;
    }
  };

  return (
    <VoiceMemoContext.Provider value={{
      memos,
      isLoaded,
      isRecording,
      recordingDuration,
      currentlyPlayingId,
      permissionStatus,
      startRecording,
      stopRecording,
      playMemo,
      pauseMemo,
      deleteMemo,
      clearAllMemos,
      getStorageSize,
      requestPermissions
    }}>
      {children}
    </VoiceMemoContext.Provider>
  );
};

export const useVoiceMemos = () => {
  const context = useContext(VoiceMemoContext);
  if (context === undefined) {
    throw new Error('useVoiceMemos must be used within a VoiceMemoProvider');
  }
  return context;
};
