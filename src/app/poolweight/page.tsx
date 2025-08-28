'use client';

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Mock data structure based on your API response


interface Pool {
    address: string;
    totalWeight: number;
    token0Symbol: string;
    token1Symbol: string;
    fee: number;
}

interface PoolData {
    success: boolean;
    pools: Pool[];
    totalPools: number;
    totalVoters: number;
    totalAlphaTokens: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function PoolWeightChart() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [poolData, setPoolData] = useState<PoolData | null>(null);

    useEffect(() => {
        let isCancelled = false;
        let delayId: ReturnType<typeof setTimeout> | null = null;
        
        async function fetchData() {
            try {
                // setLoading(true);
                setError(null);
                await new Promise<void>((resolve) => {
                    delayId = setTimeout(resolve, 60000);
                  });

                // Simulate API call - replace with your actual endpoint
                const response = await fetch('/api/poolinfo');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                console.log(result)
                
                // Mock delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (!isCancelled) {
                    setPoolData(result);
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
                    setLoading(false);
                    if (delayId) clearTimeout(delayId);
                }
            }
        }

        fetchData();

        return () => {
            isCancelled = true;
        };
    }, [poolData]); // Fixed: Added dependency array

    // Prepare data for charts
    const chartData = poolData?.pools.map((pool, index) => ({
        name: `${pool.token0Symbol}/${pool.token1Symbol}`,
        weight: pool.totalWeight,
        fee: pool.fee / 100, // Convert to percentage
        address: pool.address.slice(0, 8) + '...',
        color: COLORS[index % COLORS.length]
    })) || [];

    const totalWeight = poolData?.pools.reduce((sum, pool) => sum + pool.totalWeight, 0) || 0;

    if (loading) {
        return (
            <div className="p-6 max-w-6xl mx-auto py-30">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <span className="ml-4 text-gray-600">Loading pool data...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-6xl mx-auto py-30">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                        <div className="text-red-600">
                            <h3 className="text-sm font-medium">Error loading pool data</h3>
                            <p className="mt-1 text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto py-30">
            <div className="mb-8  text-center p-2">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Pool Weight Analytics</h1>
                <p className="text-gray-600">Comprehensive analysis of liquidity pool voting weights</p>

                {poolData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{poolData.totalPools}</div>
                            <div className="text-sm text-blue-800">Total Pools</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{totalWeight.toFixed(2)}</div>
                            <div className="text-sm text-green-800">Total Weight</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{poolData.totalVoters}</div>
                            <div className="text-sm text-purple-800">Total Voters</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">{poolData.totalAlphaTokens.toLocaleString()}</div>
                            <div className="text-sm text-orange-800">Alpha Tokens</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Charts Section */}
            {poolData && (
                <div className="space-y-8">
                    {/* Bar Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Pool Weight Distribution</h2>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="name" 
                                    angle={0}
                                    height={80}
                                />
                                <YAxis />
                                <Tooltip 
                                    formatter={(value: number) => [value.toFixed(2), 'Weight']}
                                    labelFormatter={(label: number) => `Pool: ${label}`}
                                    labelStyle={{ 
                                        color: '#3B82F6',     
                                        fontWeight: 'bold',
                                        fontSize: '16px'
                                    }}
                                    contentStyle={{ 
                                        backgroundColor: '#F9FAFB', 
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px'
                                    }}
                                    itemStyle={{ 
                                        color: '#374151'
                                    }}
                                />
                                <Bar 
                                    dataKey="weight" 
                                    fill="#3B82F6"
                                    radius={[4, 4, 0, 0]}
                                    label={(props: any) => {
                                        const { x, y, width, value } = props;
                                        return (
                                            <text 
                                                x={x + width / 2} 
                                                y={y - 5} 
                                                textAnchor="middle" 
                                                fill="#374151"
                                                fontSize="12"
                                            >
                                                {typeof value === 'number' ? value.toFixed(2) : value}
                                            </text>
                                        );
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Weight Share Distribution</h2>
                        <div className="flex flex-col lg:flex-row items-center">
                            <ResponsiveContainer width="100%" height={500} className="lg:w-1/2">
                                <PieChart >
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={true}
                                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(1) : '0.0'}%`}
                                        outerRadius={200}
                                        fill="#8884d8"
                                        dataKey="weight"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [value.toFixed(2), 'Weight']} />
                                </PieChart>
                            </ResponsiveContainer>
                            
                            {/* Legend */}
                            <div className="lg:w-1/2 lg:pl-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Pool Details</h3>
                                <div className="space-y-2">
                                    {chartData
                                    .sort((a, b) => b.weight - a.weight)
                                    .map((pool, index) => (
                                        <div key={pool.address} className="flex items-center justify-between p-2 rounded bg-gray-50">
                                            <div className="flex items-center">
                                                <div 
                                                    className="w-4 h-4 rounded mr-3"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="font-medium text-gray-900">{pool.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-900 font-semibold">{pool.weight.toFixed(2)}</div>
                                                <div className="text-xs text-gray-600">{pool.fee}% fee</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}