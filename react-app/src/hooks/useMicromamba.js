import { useCallback, useEffect, useState } from 'react';

export default function useMicromamba() {
  const [micromambaStatus, setMicromambaStatus] = useState(null);
  const [isMicromambaChecking, setIsMicromambaChecking] = useState(false);
  const [micromambaEnvironments, setMicromambaEnvironments] = useState([]);
  const [isMicromambaMenuOpen, setIsMicromambaMenuOpen] = useState(false);
  const [isMicromambaListLoading, setIsMicromambaListLoading] = useState(false);
  const [micromambaScriptEditor, setMicromambaScriptEditor] = useState(null);
  const [isMicromambaScriptSaving, setIsMicromambaScriptSaving] = useState(false);
  const [micromambaScriptSaveStatus, setMicromambaScriptSaveStatus] = useState('');

  const checkMicromamba = useCallback(async () => {
    if (!window.electronAPI?.runTerminalCmd) {
      setMicromambaStatus({ found: false, version: '', path: '', reason: 'no-electron' });
      return;
    }
    setIsMicromambaChecking(true);
    try {
      const res = await window.electronAPI.runTerminalCmd('which micromamba 2>/dev/null && micromamba --version 2>/dev/null');
      const stdout = (res?.stdout || '').trim();
      if (res?.success && stdout) {
        const lines = stdout.split('\n').map((line) => line.trim()).filter(Boolean);
        setMicromambaStatus({ found: true, path: lines[0] || 'micromamba', version: lines[1] || 'installed' });
      } else {
        const fallback = await window.electronAPI.runTerminalCmd('micromamba --version 2>/dev/null');
        const version = (fallback?.stdout || '').trim();
        setMicromambaStatus(fallback?.success && version
          ? { found: true, version, path: 'micromamba' }
          : { found: false, version: '', path: '' });
      }
    } catch (error) {
      setMicromambaStatus({ found: false, version: '', path: '', reason: error?.message });
    } finally {
      setIsMicromambaChecking(false);
    }
  }, []);

  const handleMicromambaMenuToggle = useCallback(async () => {
    if (isMicromambaMenuOpen) {
      setIsMicromambaMenuOpen(false);
      return;
    }
    setIsMicromambaMenuOpen(true);
    setIsMicromambaListLoading(true);
    try {
      const response = await window.electronAPI?.getMicromambaEnvironments?.();
      if (response?.success) {
        setMicromambaEnvironments(Array.isArray(response.envs) ? response.envs : []);
        setMicromambaStatus({ found: true, version: response.version || '', path: response.path || '', needsUpdate: false });
      } else {
        setMicromambaEnvironments([]);
        setMicromambaStatus({ found: false, version: '', path: '', error: response?.error || 'Micromamba was not found.' });
      }
    } catch (error) {
      setMicromambaEnvironments([]);
      setMicromambaStatus({ found: false, version: '', path: '', error: error?.message || 'Could not list Micromamba environments.' });
    } finally {
      setIsMicromambaListLoading(false);
    }
  }, [isMicromambaMenuOpen]);

  const handleOpenMicromambaEnvScript = useCallback(async (environment) => {
    setIsMicromambaMenuOpen(false);
    try {
      const response = await window.electronAPI?.getMicromambaEnvScript?.(environment.name);
      if (!response?.success) {
        window.alert(response?.error || 'Could not open this environment script.');
        return;
      }
      const content = String(response.content || '');
      setMicromambaScriptEditor({ ...response, content, originalContent: content });
      setMicromambaScriptSaveStatus('');
    } catch (error) {
      window.alert(error?.message || 'Could not open this environment script.');
    }
  }, []);

  const handleSaveMicromambaEnvScript = useCallback(async () => {
    if (!micromambaScriptEditor || isMicromambaScriptSaving) return;
    setIsMicromambaScriptSaving(true);
    setMicromambaScriptSaveStatus('Saving...');
    try {
      const response = await window.electronAPI?.saveMicromambaEnvScript?.({
        environmentName: micromambaScriptEditor.environment.name,
        content: micromambaScriptEditor.content
      });
      if (!response?.success) throw new Error(response?.error || 'Could not save the environment script.');
      setMicromambaScriptEditor((current) => current ? { ...current, originalContent: current.content } : current);
      setMicromambaScriptSaveStatus('Saved');
    } catch (error) {
      setMicromambaScriptSaveStatus(error?.message || 'Could not save the environment script.');
    } finally {
      setIsMicromambaScriptSaving(false);
    }
  }, [isMicromambaScriptSaving, micromambaScriptEditor]);

  const handleMicromambaScriptEditorClose = useCallback(() => {
    if (micromambaScriptEditor?.content !== micromambaScriptEditor?.originalContent
      && !window.confirm('Discard unsaved script changes?')) return;
    setMicromambaScriptEditor(null);
  }, [micromambaScriptEditor]);

  const handleMicromambaScriptContentChange = useCallback((content) => {
    setMicromambaScriptEditor((current) => current ? { ...current, content } : current);
  }, []);

  useEffect(() => {
    checkMicromamba();
  }, [checkMicromamba]);

  return {
    micromambaStatus,
    isMicromambaChecking,
    micromambaEnvironments,
    isMicromambaMenuOpen,
    isMicromambaListLoading,
    micromambaScriptEditor,
    isMicromambaScriptSaving,
    micromambaScriptSaveStatus,
    handleMicromambaMenuToggle,
    handleOpenMicromambaEnvScript,
    handleSaveMicromambaEnvScript,
    handleMicromambaScriptEditorClose,
    handleMicromambaScriptContentChange
  };
}
