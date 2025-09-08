'use client';

import { useState, useCallback } from 'react';
import { ParsedFile } from '@/lib/csvParser';
import { SessionParams, defaultSessionParams, TimeSeriesData, computeCurves } from '@/lib/dataProcessing';
import FileUpload, { FileSummary } from '@/components/FileUpload';
import ParameterPanel from '@/components/ParameterPanel';
import DataSelectionPanel from '@/components/DataSelectionPanel';
import Chart from '@/components/Chart';
import RawDataChart from '@/components/RawDataChart';
import { Play, Download } from 'lucide-react';

export default function Home() {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [params, setParams] = useState<SessionParams>(defaultSessionParams);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [selectedLaps, setSelectedLaps] = useState<number[]>([]);
  const [mode, setMode] = useState<'overall' | 'by_session' | 'by_lap'>('overall');
  const [results, setResults] = useState<{ name: string; result: any }[]>([]);
  const [rawData, setRawData] = useState<TimeSeriesData | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  const handleFilesParsed = useCallback((parsedFiles: ParsedFile[]) => {
    setFiles(parsedFiles);
    // 有効なファイルのセッションを自動選択
    const validSessions = parsedFiles
      .filter(f => !f.error)
      .map(f => f.sessionName);
    setSelectedSessions(validSessions);
  }, []);

  const combineTimeSeriesData = useCallback((): TimeSeriesData | null => {
    const validFiles = files.filter(f => !f.error);
    if (validFiles.length === 0) return null;

    let combinedData: TimeSeriesData = {
      t: [],
      rpm: [],
      speedMps: [],
      lap: [],
      session: []
    };

    validFiles.forEach(file => {
      if (selectedSessions.length === 0 || selectedSessions.includes(file.sessionName)) {
        const fileData = file.data;
        const filteredData = {
          t: fileData.t || [],
          rpm: fileData.rpm || [],
          speedMps: fileData.speedMps || [],
          lap: fileData.lap || [],
          session: fileData.session || []
        };

        // ラップフィルタリング
        if (selectedLaps.length > 0) {
          const mask = filteredData.lap.map(lap => selectedLaps.includes(lap));
          filteredData.t = filteredData.t.filter((_, i) => mask[i]);
          filteredData.rpm = filteredData.rpm.filter((_, i) => mask[i]);
          filteredData.speedMps = filteredData.speedMps.filter((_, i) => mask[i]);
          filteredData.lap = filteredData.lap.filter((_, i) => mask[i]);
          filteredData.session = filteredData.session.filter((_, i) => mask[i]);
        }

        // データを結合
        combinedData.t.push(...filteredData.t);
        combinedData.rpm.push(...filteredData.rpm);
        combinedData.speedMps.push(...filteredData.speedMps);
        combinedData.lap.push(...filteredData.lap);
        combinedData.session.push(...filteredData.session);
      }
    });

    return combinedData.t.length > 0 ? combinedData : null;
  }, [files, selectedSessions, selectedLaps]);

  const handleCompute = useCallback(async () => {
    const combinedData = combineTimeSeriesData();
    if (!combinedData) return;

    setIsComputing(true);
    setRawData(combinedData);

    try {
      const newResults: { name: string; result: any }[] = [];

      if (mode === 'overall') {
        const result = computeCurves(combinedData, params);
        newResults.push({ name: 'All', result });
      } else if (mode === 'by_session') {
        const sessions = Array.from(new Set(combinedData.session));
        sessions.forEach(session => {
          const sessionData: TimeSeriesData = {
            t: [],
            rpm: [],
            speedMps: [],
            lap: [],
            session: []
          };

          combinedData.session.forEach((s, i) => {
            if (s === session) {
              sessionData.t.push(combinedData.t[i]);
              sessionData.rpm.push(combinedData.rpm[i]);
              sessionData.speedMps.push(combinedData.speedMps[i]);
              sessionData.lap.push(combinedData.lap[i]);
              sessionData.session.push(combinedData.session[i]);
            }
          });

          if (sessionData.t.length > 0) {
            const result = computeCurves(sessionData, params);
            newResults.push({ name: session, result });
          }
        });
      } else if (mode === 'by_lap') {
        const sessionLapPairs = new Set<string>();
        combinedData.session.forEach((session, i) => {
          sessionLapPairs.add(`${session}|${combinedData.lap[i]}`);
        });

        Array.from(sessionLapPairs).forEach(pair => {
          const [session, lapStr] = pair.split('|');
          const lap = parseInt(lapStr);
          
          const lapData: TimeSeriesData = {
            t: [],
            rpm: [],
            speedMps: [],
            lap: [],
            session: []
          };

          combinedData.session.forEach((s, i) => {
            if (s === session && combinedData.lap[i] === lap) {
              lapData.t.push(combinedData.t[i]);
              lapData.rpm.push(combinedData.rpm[i]);
              lapData.speedMps.push(combinedData.speedMps[i]);
              lapData.lap.push(combinedData.lap[i]);
              lapData.session.push(combinedData.session[i]);
            }
          });

          if (lapData.t.length > 0) {
            const result = computeCurves(lapData, params);
            newResults.push({ name: `${session} | Lap ${lap}`, result });
          }
        });
      }

      setResults(newResults);
    } catch (error) {
      console.error('Error computing curves:', error);
    } finally {
      setIsComputing(false);
    }
  }, [combineTimeSeriesData, mode, params]);

  const handleDownloadResults = useCallback(() => {
    if (results.length === 0) return;

    const csvData: string[] = [];
    csvData.push('Session,RPM,Torque_Nm,Power_kW');

    results.forEach(({ name, result }) => {
      if (result.error) return;
      
      result.rpmCurve.forEach((rpm: number, i: number) => {
        csvData.push(`${name},${rpm},${result.torqueCurve[i]},${result.powerCurve[i]}`);
      });
    });

    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'kart_analysis_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [results]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            カートエンジン解析アプリ
          </h1>
          <p className="text-lg text-gray-600">
            GPSデータとRPMデータからエンジンのトルク・パワー曲線を推定
          </p>
        </div>

        {/* ファイルアップロード */}
        <div className="mb-8">
          <FileUpload onFilesParsed={handleFilesParsed} />
          <FileSummary files={files} />
        </div>

        {/* パラメータとデータ選択 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ParameterPanel params={params} onParamsChange={setParams} />
          <DataSelectionPanel
            files={files}
            selectedSessions={selectedSessions}
            selectedLaps={selectedLaps}
            mode={mode}
            onSessionsChange={setSelectedSessions}
            onLapsChange={setSelectedLaps}
            onModeChange={setMode}
          />
        </div>

        {/* 解析実行ボタン */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleCompute}
            disabled={isComputing || files.length === 0}
            className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
              isComputing || files.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isComputing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>解析中...</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                <span>解析実行</span>
              </>
            )}
          </button>
        </div>

        {/* 結果ダウンロードボタン */}
        {results.length > 0 && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleDownloadResults}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>結果をCSVでダウンロード</span>
            </button>
          </div>
        )}

        {/* グラフ表示 */}
        <div className="space-y-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">トルク・パワー曲線</h2>
            <Chart results={results} mode={mode} />
          </div>

          {rawData && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">生データプレビュー</h2>
              <RawDataChart data={rawData} />
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>カートエンジン解析アプリ - Next.js版</p>
          <p className="mt-2">
            対応ファイル形式: Alfanoロガー、Mychronロガー、一般的なCSV形式
          </p>
        </div>
      </div>
    </div>
  );
}
