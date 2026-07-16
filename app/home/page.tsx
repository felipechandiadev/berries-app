import React from 'react'
import { getDashboardStats } from '../actions/dashboard';
import BusinessStats from './ui/BusinessStats';
import DashboardCharts from './ui/DashboardCharts';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  try {
    const businessStats = await getDashboardStats();

    return {
      businessStats
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return {
      businessStats: {
        producersCount: 0,
        receptions: { totalWeight: 0, byVariety: [], byMonth: [] },
        dispatches: { totalWeight: 0 }
      }
    };
  }
}

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6" data-test-id="home-dashboard">
      <BusinessStats 
        producersCount={data.businessStats.producersCount}
        totalReceptions={data.businessStats.receptions.totalWeight}
        totalDispatches={data.businessStats.dispatches.totalWeight}
      />

      <DashboardCharts data={data.businessStats} />
    </div>
  )
}
