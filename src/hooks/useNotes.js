import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ApiService } from '../services/ApiService';

export function useNotes(days = 5) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(null);  // null | 'transcribing' | 'extracting' | 'summarizing' | 'saving' | 'done' | 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const pollRef = useRef(null);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getNotes(days);
      setNotes(data.notes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  const fetchBrief = useCallback(async () => {
    try {
      setBriefLoading(true);
      const data = await ApiService.getBrief();
      setBrief(data.brief || null);
    } catch {
      // Brief is non-critical, don't set error
    } finally {
      setBriefLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    fetchBrief();
  }, [fetchNotes, fetchBrief]);

  const createNote = useCallback(async (noteData) => {
    const data = await ApiService.createNote(noteData);
    if (data.success) {
      setNotes(prev => [data.note, ...prev]);
    }
    return data;
  }, []);

  const uploadAudio = useCallback(async (file, title) => {
    setUploading(true);
    setUploadStage('transcribing');
    setUploadProgress(10);

    const { jobId } = await ApiService.uploadAudio(file, title);

    // Poll for status
    return new Promise((resolve, reject) => {
      pollRef.current = setInterval(async () => {
        try {
          const status = await ApiService.getTranscriptionStatus(jobId);
          setUploadStage(status.stage);
          setUploadProgress(status.progress || 0);

          if (status.stage === 'done') {
            clearInterval(pollRef.current);
            setUploading(false);
            setUploadStage(null);
            setUploadProgress(0);
            if (status.note) setNotes(prev => [status.note, ...prev]);
            resolve({ success: true, note: status.note });
          } else if (status.stage === 'error') {
            clearInterval(pollRef.current);
            setUploading(false);
            setUploadStage(null);
            setUploadProgress(0);
            reject(new Error(status.error || 'Transcription failed'));
          }
        } catch (e) {
          clearInterval(pollRef.current);
          setUploading(false);
          setUploadStage(null);
          setUploadProgress(0);
          reject(e);
        }
      }, 2000); // poll every 2s
    });
  }, []);

  const uploadImages = useCallback(async (files, title, content) => {
    try {
      setUploading(true);
      const data = await ApiService.uploadImages(files, title, content);
      if (data.success) {
        setNotes(prev => [data.note, ...prev]);
      }
      return data;
    } finally {
      setUploading(false);
    }
  }, []);

  const updateNote = useCallback(async (id, data) => {
    const result = await ApiService.updateNote(id, data);
    if (result.success) {
      setNotes(prev => prev.map(n => n.id === id ? result.note : n));
    }
    return result;
  }, []);

  const deleteNote = useCallback(async (id) => {
    await ApiService.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const tickerFrequency = useMemo(() => {
    const freq = {};
    for (const note of notes) {
      for (const ticker of (note.tickers || [])) {
        if (!freq[ticker]) freq[ticker] = { count: 0, noteIds: [] };
        freq[ticker].count++;
        freq[ticker].noteIds.push(note.id);
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([ticker, data]) => ({ ticker, ...data }));
  }, [notes]);

  const notesByDate = useMemo(() => {
    const grouped = {};
    for (const note of notes) {
      const date = note.date || note.createdAt?.split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(note);
    }
    return Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, notes]) => ({ date, notes }));
  }, [notes]);

  return {
    notes,
    notesByDate,
    tickerFrequency,
    loading,
    error,
    uploading,
    uploadStage,
    uploadProgress,
    brief,
    briefLoading,
    createNote,
    updateNote,
    uploadAudio,
    uploadImages,
    deleteNote,
    refresh: fetchNotes,
    refreshBrief: fetchBrief,
  };
}
