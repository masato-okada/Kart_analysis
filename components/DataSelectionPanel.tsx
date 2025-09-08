'use client';

import { ParsedFile, TimeSeriesData } from '@/lib/csvParser';

interface DataSelectionPanelProps {
  files: ParsedFile[];
  selectedSessions: string[];
  selectedLaps: number[];
  mode: 'overall' | 'by_session' | 'by_lap';
  onSessionsChange: (sessions: string[]) => void;
  onLapsChange: (laps: number[]) => void;
  onModeChange: (mode: 'overall' | 'by_session' | 'by_lap') => void;
}

export default function DataSelectionPanel({
  files,
  selectedSessions,
  selectedLaps,
  mode,
  onSessionsChange,
  onLapsChange,
  onModeChange
}: DataSelectionPanelProps) {
  // 有効なファイルからセッション一覧を取得
  const validFiles = files.filter(f => !f.error);
  const availableSessions = validFiles.map(f => f.sessionName);

  // 利用可能なラップ一覧を取得
  const getAvailableLaps = (): number[] => {
    if (selectedSessions.length === 0) {
      // 全セッションのラップ
      const allLaps = new Set<number>();
      validFiles.forEach(file => {
        file.data.lap?.forEach(lap => allLaps.add(lap));
      });
      return Array.from(allLaps).sort((a, b) => a - b);
    } else {
      // 選択されたセッションのラップ
      const selectedLapsSet = new Set<number>();
      validFiles
        .filter(file => selectedSessions.includes(file.sessionName))
        .forEach(file => {
          file.data.lap?.forEach(lap => selectedLapsSet.add(lap));
        });
      return Array.from(selectedLapsSet).sort((a, b) => a - b);
    }
  };

  const availableLaps = getAvailableLaps();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">データ選択</h3>
      
      <div className="space-y-6">
        {/* セッション選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            セッション選択
          </label>
          <select
            multiple
            value={selectedSessions}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              onSessionsChange(values);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            size={Math.min(availableSessions.length, 5)}
          >
            {availableSessions.map(session => (
              <option key={session} value={session}>
                {session}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            複数のファイルをアップロードした場合、特定のセッションのみを解析可能
          </p>
        </div>

        {/* ラップ選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ラップ選択
          </label>
          <select
            multiple
            value={selectedLaps}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => parseInt(option.value));
              onLapsChange(values);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            size={Math.min(availableLaps.length, 5)}
          >
            {availableLaps.map(lap => (
              <option key={lap} value={lap}>
                ラップ {lap}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            特定のラップのみを解析したい場合に選択
          </p>
        </div>

        {/* 表示モード */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            表示モード
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="overall"
                checked={mode === 'overall'}
                onChange={(e) => onModeChange(e.target.value as 'overall')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">全体（結合）</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="by_session"
                checked={mode === 'by_session'}
                onChange={(e) => onModeChange(e.target.value as 'by_session')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">セッション別</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="by_lap"
                checked={mode === 'by_lap'}
                onChange={(e) => onModeChange(e.target.value as 'by_lap')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">ラップ別</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            全体: 全データを結合, セッション別: ファイルごと, ラップ別: ラップごと
          </p>
        </div>
      </div>
    </div>
  );
}
