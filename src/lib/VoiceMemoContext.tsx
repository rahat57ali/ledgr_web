import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
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

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isUserHoldingRef = useRef(false);

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
      const { status } = await Audio.getPermissionsAsync();
      setPermissionStatus(status as any);
    })();

    // AppState listener for interruptions
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (recordingRef.current) stopRecording();
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      if (recordingRef.current) {
        stopRecording();
      }
    }
    appState.current = nextAppState;
  };

  const requestPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setPermissionStatus(status as any);
    return status === 'granted';
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

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      // If user released while we were initializing, stop immediately
      if (!isUserHoldingRef.current) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          // Ignore 'no valid audio data' error for very fast aborts
        }
        return;
      }

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(async () => {
        if (recordingRef.current) {
          const status = await recordingRef.current.getStatusAsync();
          setRecordingDuration(status.durationMillis);

          if (status.durationMillis >= MAX_DURATION_MS) {
            stopRecording();
          }
        }
      }, 100);
    } catch (err) {
      isUserHoldingRef.current = false;
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    isUserHoldingRef.current = false;
    if (!recordingRef.current) return;

    try {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setIsRecording(false);
      recordingRef.current = null;

      if (uri) {
        const filename = `memo_${Date.now()}.m4a`;
        const destUri = MEMO_DIR + filename;
        await FileSystem.moveAsync({ from: uri, to: destUri });

        const { sound, status } = await Audio.Sound.createAsync({ uri: destUri });
        const durationMs = (status as any).durationMillis || 0;
        await sound.unloadAsync();

        const newMemo: VoiceMemo = {
          id: Date.now().toString(),
          uri: destUri,
          durationMs,
          createdAt: new Date().toISOString(),
        };

        const updated = [newMemo, ...memos];
        setMemos(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const playMemo = async (memoId: string) => {
    // Stop current playback if any
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: memo.uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setCurrentlyPlayingId(memoId);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setCurrentlyPlayingId(null);
        }
      });
    } catch (err) {
      console.error('Failed to play memo', err);
    }
  };

  const pauseMemo = async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
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

      // In real Expo FileSystem, getInfoAsync on a directory doesn't always return size
      // We might need to iterate over files
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
