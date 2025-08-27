'use client'
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Token {
  symbol?: string;
}

interface Pool {
  feeTier?: string;
  tick?: number | string;
  token0Price?: number | string;
  token1Price?: number | string;
}

interface Tick {
  tickIdx?: number | string;
}

interface USDValue {
  token0Value?: number | string;
  token1Value?: number | string;
  totalValue?: number | string;
  token1Price?: number | string;
}

interface Position {
  id?: string | number;
  token0?: Token;
  token1?: Token;
  pool?: Pool;
  tickLower?: Tick;
  tickUpper?: Tick;
  token0Amount?: number | string;
  token1Amount?: number | string;
  liquidity?: number | string;
  usdValue?: USDValue;
}

interface PoolInfo {
  [address: string]: Position[];
}

export default function Page() {
  const [poolInfo, setPoolInfo] = useState<PoolInfo>({});
  const [walletAddress, setWalletAddress] = useState<string>('5EEwjeCMWdp9aEozDNdEGAvwqT1yBXCAFMX6QvwEqSAP4rgR');
  const [selectedPosition, setSelectedPosition] = useState<Position[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [addressesWithPositions, setAddressesWithPositions] = useState<string[]>([]);
  const [showStatus, setShowStatus] = useState(false);
  
  // New state for percentage range inputs
  const [lowRangePercent, setLowRangePercent] = useState<number>(10);
  const [highRangePercent, setHighRangePercent] = useState<number>(90);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/position');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();

        if (isCancelled) return;

        const addressesWithPositions = Object.keys(result.positions || {})
          .filter(address => result.positions[address] && result.positions[address].length > 0);

        setPoolInfo(result.positions);
        setAddressesWithPositions(addressesWithPositions);
        
        if (addressesWithPositions.length > 0 && !selectedAddress) {
          setSelectedAddress(addressesWithPositions[0]);
        }

        const positions = poolInfo[walletAddress];
      
        if (positions && positions.length > 0) {
          setSelectedPosition(positions);
          console.log(positions)
        } else {
          setError('No positions found for this wallet address');
          setSelectedPosition(null);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('Error fetching pool info:', error);
        if (!isCancelled) {
          if (typeof error === 'object' && error !== null && 'message' in error) {
            setError((error as { message?: string }).message || 'Failed to fetch pool information');
          } else {
            setError('Failed to fetch pool information');
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleWalletSubmit = async () => {
    if (!walletAddress.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const positions = poolInfo[walletAddress];
      
      if (positions && positions.length > 0) {
        setSelectedPosition(positions);
        console.log(positions)
      } else {
        setError('No positions found for this wallet address');
        setSelectedPosition(null);
      }
    } catch (error) {
      setError('Failed to fetch wallet positions');
      setSelectedPosition(null);
    } finally {
      setLoading(false);
    }
  };

  // New function to calculate range thresholds
  const calculateRangeThresholds = (position: Position) => {
    const tickUpper = Number(position.tickUpper?.tickIdx || 0);
    const tickLower = Number(position.tickLower?.tickIdx || 0);
    const tickRange = tickUpper - tickLower;
    
    const lowThreshold = tickLower + (tickRange * lowRangePercent / 100);
    const highThreshold = tickLower + (tickRange * highRangePercent / 100);
    
    return { 
      lowThreshold: Math.round(lowThreshold), 
      highThreshold: Math.round(highThreshold),
      tickRange 
    };
  };

  // New function to check if position is dangerous
  const checkDangerousPosition = (position: Position) => {
    const currentTick = Number(position.pool?.tick || 0);
    const { lowThreshold, highThreshold } = calculateRangeThresholds(position);
    
    // Check if current tick is very close to thresholds (within 50 ticks tolerance)
    const tolerance = 50;
    const isNearLowThreshold = Math.abs(currentTick - lowThreshold) <= tolerance;
    const isNearHighThreshold = Math.abs(currentTick - highThreshold) <= tolerance;
    
    return {
      isDangerous: isNearLowThreshold || isNearHighThreshold,
      nearLow: isNearLowThreshold,
      nearHigh: isNearHighThreshold,
      currentTick,
      lowThreshold,
      highThreshold
    };
  };

  const formatNumber = (value: string | number, decimals = 6) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toFixed(decimals);
  };

  const formatCurrency = (value: string | number,) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatETHCurrency = (value: string | number, value1: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const num1 = typeof value1 === 'string' ? parseFloat(value1) : value1;
    console.log(num, num1)
    const result = num/num1;
    console.log(num, num1, result)
    return result.toFixed(3);
  };
  
  const generateTickData = (position: Position) => {
    if (!position.tickLower?.tickIdx || !position.tickUpper?.tickIdx || !position.pool?.tick) {
      return [];
    }

    const tickLower = Number(position.tickLower.tickIdx);
    const tickUpper = Number(position.tickUpper.tickIdx);
    const currentTick = Number(position.pool.tick);
    
    const minTick = Math.min(tickLower, currentTick);
    const maxTick = Math.max(tickUpper, currentTick);
    const range = maxTick - minTick;
    
    const chartStart = minTick;
    const chartEnd = maxTick;
    
    const step = Math.max(1, Math.floor((chartEnd - chartStart) / 10000));
    
    const data = [];
    
    for (let i = chartStart; i <= chartEnd; i += step) {
      data.push({
        tick: i,
        inRange: i >= tickLower && i <= tickUpper ? 100 : 0,
        liquidity: i >= tickLower && i <= tickUpper ? 80 : 0
      });
    }
    
    const currentTickExists = data.some(d => Math.abs(d.tick - currentTick) < step/2);
    if (!currentTickExists) {
      data.push({
        tick: currentTick,
        inRange: currentTick >= tickLower && currentTick <= tickUpper ? 100 : 0,
        liquidity: currentTick >= tickLower && currentTick <= tickUpper ? 80 : 0
      });
    }
    
    return data.sort((a, b) => a.tick - b.tick);
  };

  return(
    <div className="p-6 max-w-6xl mx-auto py-30">
      <div className="mb-8 text-center p-2">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pool Position Analyzer</h1>
        <p className="text-gray-600">Enter your wallet address to view your Uniswap V3 positions</p>
      </div>

      {/* Range Configuration Section */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Alert Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Low Range Alert (%)
            </label>
            <input
              type="number"
              value={lowRangePercent}
              onChange={(e) => setLowRangePercent(Number(e.target.value))}
              min="0"
              max="100"
              className="w-full px-3 text-gray-900 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. 20"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when current tick approaches this % of position range</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              High Range Alert (%)
            </label>
            <input
              type="number"
              value={highRangePercent}
              onChange={(e) => setHighRangePercent(Number(e.target.value))}
              min="0"
              max="100"
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. 80"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when current tick approaches this % of position range</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter your wallet address..."
              className="w-full text-gray-500 px-3 py-2 border bg-gray-100 border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleWalletSubmit}
            disabled={loading || !walletAddress.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Analyze Position'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {selectedPosition?.map((position, index) => {
        const dangerAlert = checkDangerousPosition(position);
        const { lowThreshold, highThreshold, tickRange } = calculateRangeThresholds(position);
        
        return (
          <div key={index} className="space-y-6 mb-8">
            {/* Danger Alert */}
            {dangerAlert.isDangerous && (
              <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-md">
                <div className="flex items-center">
                  <div className="text-red-500 text-2xl mr-3">⚠️</div>
                  <div>
                    <h3 className="text-lg font-bold text-red-800">Dangerous  {position.token0?.symbol} / {position.token1?.symbol} Position Alert!</h3>
                    <p className="text-red-700">
                      Current tick ({dangerAlert.currentTick}) is very close to your{' '}
                      {dangerAlert.nearLow && 'low'}{dangerAlert.nearLow && dangerAlert.nearHigh && ' and '}
                      {dangerAlert.nearHigh && 'high'} threshold
                      {dangerAlert.nearLow && ` (${lowThreshold})`}
                      {dangerAlert.nearHigh && ` (${highThreshold})`}.
                    </p>
                    <p className="text-red-600 text-sm mt-1">
                      Consider adjusting your position or monitoring closely for potential out-of-range scenarios.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {position.token0?.symbol} / {position.token1?.symbol} Position
                  </h3>
                  <p className="text-sm text-gray-600">
                    Total Value: {formatCurrency(position.usdValue?.totalValue || '0')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Alert Thresholds: {lowThreshold} - {highThreshold} (Range: {tickRange})
                  </p>
                </div>
                <button 
                  className="text-gray-100 cursor-pointer bg-blue-500 px-3 py-1 rounded hover:bg-blue-300" 
                  onClick={() => setShowStatus(!showStatus)}
                >
                  {showStatus ? 'Hide' : 'More'}
                </button>
              </div>
            </div>

            {/* Position Details Card */}
            <div className="bg-gray-50 rounded-lg p-6" style={{ display: showStatus ? 'block' : 'none' }}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Position Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Token Pair */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Token Pair</h3>
                  <p className="text-lg text-gray-500 font-semibold">
                    {position.token0?.symbol} / {position.token1?.symbol}
                  </p>
                  <p className="text-sm text-gray-600">Fee: {Number(position.pool?.feeTier) / 10000}%</p>
                </div>

                {/* Current Tick */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Current Tick</h3>
                  <p className="text-lg text-gray-500 font-semibold">{position.pool?.tick}</p>
                  <div className="text-sm text-gray-600">
                    <p>Lower: {position.tickLower?.tickIdx}</p>
                    <p>Upper: {position.tickUpper?.tickIdx}</p>
                  </div>
                </div>

                {/* Prices */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Token Prices</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-500">{position.token0?.symbol}:</span>{' '}
                      {formatNumber(position.pool?.token0Price || '0', 4)} {position.token1?.symbol}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-500">{position.token1?.symbol}:</span>{' '}
                      {formatNumber(position.pool?.token1Price || '0', 8)} {position.token0?.symbol}
                    </p>
                  </div>
                </div>

                {/* Position Amounts */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Position Amounts</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">{position.token0?.symbol}:</span>{' '}
                      {formatNumber(position.token0Amount || '0')}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">{position.token1?.symbol}:</span>{' '}
                      {formatNumber(position.token1Amount || '0')}
                    </p>
                  </div>
                </div>

                {/* USD Values */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">USD Values</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">{position.token0?.symbol}:</span>{' '}
                      {formatCurrency(position.usdValue?.token0Value || '0')}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">{position.token1?.symbol}:</span>{' '}
                      {formatCurrency(position.usdValue?.token1Value || '0')}
                    </p>
                  </div>
                </div>

                {/* Total Value */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Position Value</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(position.usdValue?.totalValue || '0')}/{formatETHCurrency(position.usdValue?.totalValue || '0', position.usdValue?.token1Price || '0')}{position.token1?.symbol}
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Position Range Visualization */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Position Range Visualization</h2>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateTickData(position)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="tick"
                      label={{ value: 'Tick', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Liquidity %', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'liquidity' ? `${value}%` : value,
                        name === 'liquidity' ? 'Liquidity' : name
                      ]}
                      labelStyle={{ 
                        color: '#3B82F6',     
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}
                    />
                    
                    {/* Current Tick Reference Line */}
                    <ReferenceLine 
                      x={Number(position.pool?.tick)} 
                      stroke="red" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{ value: "Current Tick", position: "top" }}
                    />
                    
                    {/* Position Boundaries */}
                    <ReferenceLine 
                      x={Number(position.tickLower?.tickIdx)} 
                      stroke="green" 
                      strokeWidth={2}
                      label={{ value: "", position: "left" }}
                    />
                    
                    <ReferenceLine 
                      x={Number(position.tickUpper?.tickIdx)} 
                      stroke="green" 
                      strokeWidth={2}
                      label={{ value: "Upper", position: "right" }}
                    />
                    
                    {/* Alert Threshold Lines */}
                    <ReferenceLine 
                      x={lowThreshold} 
                      stroke="red" 
                      strokeWidth={1}
                      label={{ value: "Low Level", position: "right" }}
                    />
                    
                    <ReferenceLine 
                      x={highThreshold} 
                      stroke="red" 
                      strokeWidth={1}
                      label={{ value: "High Level", position: "right" }}
                    />
                    
                    <Line 
                      type="monotone" 
                      dataKey="liquidity" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      dot={false}
                    />
                    
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-red-500"></div>
                    <span>Current Tick ({position.pool?.tick})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-green-500"></div>
                    <span>Position Range ({position.tickLower?.tickIdx} - {position.tickUpper?.tickIdx})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-blue-500"></div>
                    <span>Active Liquidity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-orange-500" style={{ borderStyle: 'dashed' }}></div>
                    <span>Alert Thresholds ({lowThreshold} - {highThreshold})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
}