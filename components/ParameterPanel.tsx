'use client';

import { SessionParams } from '@/lib/dataProcessing';

interface ParameterPanelProps {
  params: SessionParams;
  onParamsChange: (params: SessionParams) => void;
}

export default function ParameterPanel({ params, onParamsChange }: ParameterPanelProps) {
  const updateParam = (key: keyof SessionParams, value: any) => {
    onParamsChange({ ...params, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">セッション設定</h3>
      
      <div className="space-y-6">
        {/* 質量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            質量 [kg] (ドライバー+カート+燃料)
          </label>
          <input
            type="number"
            value={params.massKg}
            onChange={(e) => updateParam('massKg', parseFloat(e.target.value) || 165)}
            min="80"
            max="250"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            目安: 軽量カート 120-140kg, 標準カート 150-180kg
          </p>
        </div>

        {/* 気温 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            気温 [°C]
          </label>
          <input
            type="number"
            value={params.tempC}
            onChange={(e) => updateParam('tempC', parseFloat(e.target.value) || 25)}
            step="0.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            空気密度計算に使用。標準: 20-30°C
          </p>
        </div>

        {/* 気圧 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            気圧 [hPa]
          </label>
          <input
            type="number"
            value={params.pressureHpa}
            onChange={(e) => updateParam('pressureHpa', parseFloat(e.target.value) || 1013.25)}
            step="0.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            標準気圧: 1013.25hPa。高地では低くなる
          </p>
        </div>

        {/* ドライブトレイン効率 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ドライブトレイン効率 η: {params.eta.toFixed(3)}
          </label>
          <input
            type="range"
            min="0.85"
            max="0.95"
            step="0.005"
            value={params.eta}
            onChange={(e) => updateParam('eta', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            チェーン駆動: 0.90-0.95, ベルト駆動: 0.85-0.90
          </p>
        </div>

        {/* 空気抵抗係数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            空気抵抗係数 CdA [m²]: {params.cda.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.3"
            max="1.2"
            step="0.01"
            value={params.cda}
            onChange={(e) => updateParam('cda', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            カート: 0.4-0.8, オープンホイール: 0.3-0.6
          </p>
        </div>

        {/* 転がり抵抗係数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            転がり抵抗係数 Crr: {params.crr.toFixed(3)}
          </label>
          <input
            type="range"
            min="0.005"
            max="0.03"
            step="0.001"
            value={params.crr}
            onChange={(e) => updateParam('crr', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            スリックタイヤ: 0.010-0.015, レインタイヤ: 0.015-0.025
          </p>
        </div>

        {/* 自動推定チェックボックス */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.useCoastdownFit}
              onChange={(e) => updateParam('useCoastdownFit', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              減速データからCdA/Crrを自動推定
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            チェックすると減速時のデータから空気抵抗・転がり抵抗を自動計算
          </p>
        </div>

        <hr className="border-gray-200" />

        <h4 className="text-md font-semibold text-gray-800">解析設定</h4>

        {/* RPMビン幅 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            RPMビン幅
          </label>
          <input
            type="number"
            value={params.rpmBin}
            onChange={(e) => updateParam('rpmBin', parseInt(e.target.value) || 200)}
            min="50"
            max="1000"
            step="50"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            データをまとめるRPM範囲。小さいほど詳細、大きいほど滑らか
          </p>
        </div>

        {/* エンベロープパーセンタイル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            エンベロープパーセンタイル: {params.percentile.toFixed(0)}%
          </label>
          <input
            type="range"
            min="80"
            max="99"
            step="1"
            value={params.percentile}
            onChange={(e) => updateParam('percentile', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            95%: 外れ値を除去して代表値を取得
          </p>
        </div>

        {/* 最大スリップ率 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            最大スリップ率 |ε|: {(params.maxSlip * 100).toFixed(1)}%
          </label>
          <input
            type="range"
            min="0.02"
            max="0.15"
            step="0.005"
            value={params.maxSlip}
            onChange={(e) => updateParam('maxSlip', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            スリップ率が大きいデータは除外。0.05=5%
          </p>
        </div>

        {/* 最低速度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            最低速度 [m/s]
          </label>
          <input
            type="number"
            value={params.minSpeedMps}
            onChange={(e) => updateParam('minSpeedMps', parseFloat(e.target.value) || 5)}
            min="0"
            max="30"
            step="0.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            この速度以下のデータは解析から除外。5m/s=18km/h
          </p>
        </div>
      </div>
    </div>
  );
}
