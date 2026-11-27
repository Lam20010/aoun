// Each screen says what "read it to me" should read. The phone reads it itself (see read_screen).
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../store';

export function useReadable(lines: string[]) {
  const key = lines.join('\n');
  useFocusEffect(useCallback(() => { useApp.getState().set({ screenText: key ? key.split('\n') : [] }); }, [key]));
}
