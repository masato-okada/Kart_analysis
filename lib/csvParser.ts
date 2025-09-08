import Papa from 'papaparse';
import { autoMapColumns, toStandardTimeSeries, TimeSeriesData } from './dataProcessing';

export interface ParsedFile {
  filename: string;
  sessionName: string;
  data: TimeSeriesData;
  error?: string;
}

export function parseCSVFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            resolve({
              filename: file.name,
              sessionName: getSessionNameFromFilename(file.name),
              data: {} as TimeSeriesData,
              error: `CSV parsing error: ${results.errors[0].message}`
            });
            return;
          }

          const data = results.data as any[][];
          if (data.length === 0) {
            resolve({
              filename: file.name,
              sessionName: getSessionNameFromFilename(file.name),
              data: {} as TimeSeriesData,
              error: 'Empty CSV file'
            });
            return;
          }

          const columns = data[0] as string[];
          const rows = data.slice(1);
          
          const mapping = autoMapColumns(columns);
          const sessionName = getSessionNameFromFilename(file.name);
          
          const timeSeriesData = toStandardTimeSeries(rows, columns, mapping, sessionName);
          
          resolve({
            filename: file.name,
            sessionName,
            data: timeSeriesData
          });
        } catch (error) {
          resolve({
            filename: file.name,
            sessionName: getSessionNameFromFilename(file.name),
            data: {} as TimeSeriesData,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      },
      error: (error) => {
        resolve({
          filename: file.name,
          sessionName: getSessionNameFromFilename(file.name),
          data: {} as TimeSeriesData,
          error: `File reading error: ${error.message}`
        });
      }
    });
  });
}

export function getSessionNameFromFilename(filename: string): string {
  const base = filename.split('/').pop() || filename;
  const dotIndex = base.lastIndexOf('.');
  return dotIndex > 0 ? base.substring(0, dotIndex) : base;
}

export function parseMultipleCSVFiles(files: File[]): Promise<ParsedFile[]> {
  return Promise.all(files.map(file => parseCSVFile(file)));
}
