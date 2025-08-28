'use client';
import { useState, useEffect, useMemo } from "react";

export const Total =()=> {
  const [poolInfo, setPoolInfo] = useState<PoolInfo>({});
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [addressesWithPositions, setAddressesWithPositions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMinersModal, setShowMinersModal] = useState(false);
  const [selectedPoolForMiners, setSelectedPoolForMiners] = useState<PoolStats | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let delayId: ReturnType<typeof setTimeout> | null = null;
    async function fetchData() {
      try {
        // setLoading(true);
        setError(null);

        await new Promise<void>((resolve) => {
          delayId = setTimeout(resolve, 30000);
        });
        
        const response = await fetch('/api/position');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();

        // Prevent state updates if component unmounted
        if (isCancelled) return;

        // Get addresses with actual positions
        const addressesWithPositions = Object.keys(result.positions || {})
          .filter(address => result.positions[address] && result.positions[address].length > 0);

        console.log('Addresses with positions:', addressesWithPositions);
        console.log('Count:', addressesWithPositions.length);

        // Update state with fetched data
        setPoolInfo(result);
        setAddressesWithPositions(addressesWithPositions);
        
        // Auto-select first address if available
        if (addressesWithPositions.length > 0 && !selectedAddress) {
          setSelectedAddress(addressesWithPositions[0]);
        }
        
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
          if (delayId) clearTimeout(delayId);
          setLoading(false);
        }
      }
    }

    fetchData();

    // Cleanup function to prevent memory leaks
    return () => {
      isCancelled = true;
    };
  }, [addressesWithPositions]); // Empty dependency array - fetch once on mount

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
    positions?: {
      [address: string]: Position[];
    };
    // Add other fields if present in the API response
    [key: string]: any;
  }

  // New interface for pool statistics
  interface PoolStats {
    poolKey: string;
    token0Symbol: string;
    token1Symbol: string;
    feeTier: string;
    minerCount: number;
    totalPositions: number;
    miners: string[];
    totalLiquidity: number;
    totalUSDValue: number;
  }

  // Calculate pool statistics with miner counts
  const poolStats = useMemo(() => {
    if (!poolInfo || !poolInfo.positions) return [];

    const poolMap = new Map<string, {
      miners: Set<string>;
      positions: Position[];
      token0Symbol: string;
      token1Symbol: string;
      feeTier: string;
    }>();

    // Group positions by pool
    Object.entries(poolInfo.positions).forEach(([address, positions]) => {
      positions.forEach(position => {
        const poolKey = `${position.token0?.symbol || 'Token0'}-${position.token1?.symbol || 'Token1'}-${position.pool?.feeTier || '0'}`;
        
        if (!poolMap.has(poolKey)) {
          poolMap.set(poolKey, {
            miners: new Set<string>(),
            positions: [],
            token0Symbol: position.token0?.symbol || 'Token0',
            token1Symbol: position.token1?.symbol || 'Token1',
            feeTier: position.pool?.feeTier || '0'
          });
        }

        const poolData = poolMap.get(poolKey)!;
        poolData.miners.add(address);
        poolData.positions.push(position);
      });
    });

    // Convert to array and calculate statistics
    const stats: PoolStats[] = Array.from(poolMap.entries()).map(([poolKey, data]) => {
      const totalLiquidity = data.positions.reduce((sum, pos) => {
        const liquidity = typeof pos.liquidity === 'string' ? parseFloat(pos.liquidity) : pos.liquidity;
        return sum + (liquidity || 0);
      }, 0);

      const totalUSDValue = data.positions.reduce((sum, pos) => {
        const usdValue = typeof pos.usdValue?.totalValue === 'string' 
          ? parseFloat(pos.usdValue.totalValue) 
          : pos.usdValue?.totalValue;
        return sum + (usdValue || 0);
      }, 0);

      return {
        poolKey,
        token0Symbol: data.token0Symbol,
        token1Symbol: data.token1Symbol,
        feeTier: data.feeTier,
        minerCount: data.miners.size,
        totalPositions: data.positions.length,
        miners: Array.from(data.miners),
        totalLiquidity,
        totalUSDValue
      };
    });

    // Sort by miner count (descending)
    return stats.sort((a, b) => b.minerCount - a.minerCount);
  }, [poolInfo]);

  const formatNumber = (num: number | string | undefined, decimals: number = 4): string => {
    if (!num) return '0';
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number)) return '0';
    return number.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: decimals 
    });
  };

  const formatAddress = (address: string): string => {
    if (!address || typeof address !== 'string') return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getSelectedPositions = () => {
    if (!selectedAddress || !poolInfo || !poolInfo.positions) return [];
    return poolInfo.positions[selectedAddress] || [];
  };

  const handleAddressSelect = (address: string): void => {
    setSelectedAddress(address);
  };

  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };

  const handleShowAllMiners = (pool: PoolStats) => {
    setSelectedPoolForMiners(pool);
    setShowMinersModal(true);
  };

  const handleCloseMinersModal = () => {
    setShowMinersModal(false);
    setSelectedPoolForMiners(null);
  };

  const handleMinerClick = (minerAddress: string) => {
    setSelectedAddress(minerAddress);
    handleCloseMinersModal();
  };

  // Loading state
  if (loading) {
    return (
      <div className="font-sans min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Pool Data...</h3>
              <p className="text-gray-500">Please wait while we fetch the latest pool information.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="font-sans min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-400 mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!poolInfo || addressesWithPositions.length === 0) {
    return (
      <div className="font-sans min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Pool Positions Dashboard</h1>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V9a2 2 0 01-2 2h-2m0 0v2a2 2 0 002 2h2a2 2 0 002-2v-2m0 0h-2m-4 0h2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pool Positions Found</h3>
              <p className="text-gray-500">There are currently no addresses with active pool positions.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Pool Positions Dashboard</h1>
        
        {/* Pool Statistics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Pool Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {poolStats.map((pool, index) => (
              <div key={pool.poolKey} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {pool.token0Symbol}/{pool.token1Symbol}
                  </h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    {(parseFloat(pool.feeTier) / 10000).toFixed(2)}%
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Miners:</span>
                    <div className="flex items-center">
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                        {pool.minerCount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Total Positions:</span>
                    <span className="text-gray-900 font-medium">{pool.totalPositions}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Total Liquidity:</span>
                    <span className="text-gray-900 font-medium">{formatNumber(pool.totalLiquidity, 0)}</span>
                  </div>
                  
                  {pool.totalUSDValue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Total USD Value:</span>
                      <span className="text-green-600 font-medium">${formatNumber(pool.totalUSDValue, 2)}</span>
                    </div>
                  )}
                  
                  {/* Miner addresses preview with interactive buttons */}
                  <div className="pt-2 border-t">
                    <span className="text-gray-600 text-xs">Miners:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {pool.miners.slice(0, 3).map(minerAddress => (
                        <button
                          key={minerAddress}
                          onClick={() => handleMinerClick(minerAddress)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-mono transition-colors cursor-pointer"
                          title={`Click to view positions for ${minerAddress}`}
                        >
                          {formatAddress(minerAddress)}
                        </button>
                      ))}
                      {pool.miners.length > 3 && (
                        <button 
                          onClick={() => handleShowAllMiners(pool)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          +{pool.miners.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Wallet Addresses List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Wallet Addresses ({addressesWithPositions.length})
              </h2>
              
              {addressesWithPositions.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {addressesWithPositions.map((address) => {
                    const positionCount = poolInfo?.positions?.[address]?.length || 0;
                    return (
                      <button
                        key={address}
                        onClick={() => handleAddressSelect(address)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedAddress === address
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        aria-label={`Select address ${formatAddress(address)} with ${positionCount} positions`}
                      >
                        <div className="font-mono text-sm text-gray-600">
                          {formatAddress(address)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {positionCount} position{positionCount !== 1 ? 's' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No addresses with positions found</p>
                </div>
              )}
            </div>
          </div>

          {/* Position Details */}
          <div className="lg:col-span-2">
            {selectedAddress ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Positions for {formatAddress(selectedAddress)}
                    </h2>
                    <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                      {getSelectedPositions().length} position{getSelectedPositions().length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="space-y-6">
                    {getSelectedPositions().map((position, index) => {
                      // Find the pool stats for this position
                      const currentPoolKey = `${position.token0?.symbol || 'Token0'}-${position.token1?.symbol || 'Token1'}-${position.pool?.feeTier || '0'}`;
                      const currentPoolStats = poolStats.find(pool => pool.poolKey === currentPoolKey);
                      
                      return (
                        <div key={position.id || index} className="border rounded-lg p-6 bg-gray-50">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {position.token0?.symbol || 'Token0'}/{position.token1?.symbol || 'Token1'} Pool
                              </h3>
                              {currentPoolStats && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {currentPoolStats.minerCount} miners in this pool
                                </p>
                              )}
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              Fee: {position.pool?.feeTier ? (parseFloat(position.pool.feeTier) / 10000).toFixed(2) : '0.00'}%
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Pool Information */}
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-700 border-b pb-2">Pool Information</h4>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Current Tick:</span>
                                  <span className="font-mono text-gray-600">{position.pool?.tick || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Tick Lower:</span>
                                  <span className="font-mono text-gray-600">{position.tickLower?.tickIdx || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Tick Upper:</span>
                                  <span className="font-mono text-gray-600">{position.tickUpper?.tickIdx || 'N/A'}</span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Token0 Price:</span>
                                  <span className="font-mono text-gray-600">{formatNumber(position.pool?.token0Price, 6)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Token1 Price:</span>
                                  <span className="font-mono text-gray-600">{formatNumber(position.pool?.token1Price, 6)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Position Details */}
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-700 border-b pb-2">Position Details</h4>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{position.token0?.symbol || 'Token0'} Amount:</span>
                                  <span className="font-mono text-gray-600">{formatNumber(position.token0Amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{position.token1?.symbol || 'Token1'} Amount:</span>
                                  <span className="font-mono text-gray-600">{formatNumber(position.token1Amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Liquidity:</span>
                                  <span className="font-mono text-gray-600">{formatNumber(position.liquidity, 0)}</span>
                                </div>
                              </div>

                              {position.usdValue && (
                                <div className="bg-green-50 p-3 rounded">
                                  <h5 className="font-medium text-green-800 mb-2">USD Values</h5>
                                  <div className="space-y-1 text-sm text-green-700">
                                    <div className="flex justify-between">
                                      <span>{position.token0?.symbol || 'Token0'} Value:</span>
                                      <span>${formatNumber(position.usdValue.token0Value, 2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>{position.token1?.symbol || 'Token1'} Value:</span>
                                      <span>${formatNumber(position.usdValue.token1Value, 2)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold border-t pt-1 border-green-200">
                                      <span>Total Value:</span>
                                      <span>${formatNumber(position.usdValue.totalValue, 2)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a wallet address</h3>
                  <p className="text-gray-500">Choose a wallet address from the list to view its pool positions and details.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Miners Modal */}
      {showMinersModal && selectedPoolForMiners && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  All Miners in {selectedPoolForMiners.token0Symbol}/{selectedPoolForMiners.token1Symbol} Pool
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Fee Tier: {(parseFloat(selectedPoolForMiners.feeTier) / 10000).toFixed(2)}% • 
                  Total: {selectedPoolForMiners.minerCount} miners
                </p>
              </div>
              <button
                onClick={handleCloseMinersModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPoolForMiners.miners.map((minerAddress, index) => {
                  const positionCount = poolInfo?.positions?.[minerAddress]?.filter(pos => 
                    `${pos.token0?.symbol || 'Token0'}-${pos.token1?.symbol || 'Token1'}-${pos.pool?.feeTier || '0'}` === selectedPoolForMiners.poolKey
                  ).length || 0;
                  
                  return (
                    <button
                      key={minerAddress}
                      onClick={() => handleMinerClick(minerAddress)}
                      className={`p-4 border rounded-lg text-left transition-colors hover:bg-gray-50 ${
                        selectedAddress === minerAddress 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono text-sm text-gray-900 mb-1">
                            {formatAddress(minerAddress)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {positionCount} position{positionCount !== 1 ? 's' : ''} in this pool
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          #{index + 1}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                Click on any miner address to view their positions
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}