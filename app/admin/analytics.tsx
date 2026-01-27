import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const screenWidth = Dimensions.get('window').width;

interface AnalyticsData {
  user_analytics?: {
    total_users: number;
    active_users: number;
    inactive_users: number;
    new_users_7_days: number;
    new_users_30_days: number;
    growth_percentage_30_days: number;
    active_rate: number;
  };
  session_analytics?: {
    total_sessions: number;
    completed_sessions: number;
    active_sessions: number;
    cancelled_sessions: number;
    session_types: {
      chat: number;
      audio: number;
      video: number;
    };
    average_duration_minutes: number;
    completion_rate: number;
  };
  financial_analytics?: {
    total_revenue: number;
    monthly_revenue: number;
    weekly_revenue: number;
    average_transaction_value: number;
    payment_status: {
      completed: number;
      pending: number;
      failed: number;
    };
  };
  revenue_data?: {
    labels: string[];
    data: number[];
  };
  // New fields from your Django views
  total_professionals?: number;
  pending_approvals?: number;
  approved_professionals?: number;
  total_revenue?: number;
  active_disputes?: number;
  monthly_growth?: number;
  completed_sessions?: number;
  total_users?: number;
  active_users?: number;
  monthly_revenue?: number;
  average_session_value?: number;
  total_sessions?: number;
  active_sessions?: number;
  total_disputes?: number;
  total_categories?: number;
  enabled_categories?: number;
}

// Custom Chart Components
const BarChart = ({ data, labels, colors }: { data: number[], labels: string[], colors: string[] }) => {
  const maxValue = Math.max(...data, 1);
  const chartHeight = 150;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barChart}>
        {data.map((value, index) => (
          <View key={index} style={styles.barColumn}>
            <View style={styles.barLabelContainer}>
              <Text style={styles.barLabel}>{labels[index]}</Text>
            </View>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    height: maxValue > 0 ? (value / maxValue) * chartHeight : 0,
                    backgroundColor: colors[index % colors.length],
                  },
                ]}
              />
            </View>
            <View style={styles.barValueContainer}>
              <Text style={styles.barValue}>{value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const LineChart = ({ data, labels }: { data: number[], labels: string[] }) => {
  const maxValue = Math.max(...data, 1);
  const chartHeight = 150;
  const chartWidth = screenWidth - 80;
  const pointSpacing = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  const points = data.map((value, index) => ({
    x: index * pointSpacing,
    y: maxValue > 0 ? chartHeight - (value / maxValue) * chartHeight : chartHeight,
  }));

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.lineChart, { height: chartHeight }]}>
        {/* Grid lines */}
        <View style={styles.gridLine} />
        <View style={[styles.gridLine, { top: chartHeight * 0.25 }]} />
        <View style={[styles.gridLine, { top: chartHeight * 0.5 }]} />
        <View style={[styles.gridLine, { top: chartHeight * 0.75 }]} />
        
        {/* Line */}
        <View style={styles.linePath}>
          {points.map((point, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <View
                  style={[
                    styles.lineSegment,
                    {
                      left: points[index - 1].x,
                      top: points[index - 1].y,
                      width: Math.sqrt(
                        Math.pow(point.x - points[index - 1].x, 2) +
                        Math.pow(point.y - points[index - 1].y, 2)
                      ),
                      transform: [
                        {
                          rotate: Math.atan2(
                            point.y - points[index - 1].y,
                            point.x - points[index - 1].x
                          ) + 'rad',
                        },
                      ],
                    },
                  ]}
                />
              )}
              <View
                style={[
                  styles.linePoint,
                  {
                    left: point.x - 4,
                    top: point.y - 4,
                    backgroundColor: '#007AFF',
                  },
                ]}
              />
            </React.Fragment>
          ))}
        </View>

        {/* Labels */}
        <View style={styles.lineLabels}>
          {labels.map((label, index) => (
            <Text key={index} style={styles.lineLabel}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const PieChart = ({ data }: { data: { name: string; value: number; color: string }[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  if (total === 0) {
    return (
      <View style={styles.chartContainer}>
        <View style={styles.pieChart}>
          <View style={styles.pieContainer}>
            <View style={[styles.pieSegment, { backgroundColor: '#e0e0e0' }]}>
              <View style={[styles.pieSegmentInner, { transform: [{ rotate: '360deg' }] }]} />
            </View>
          </View>
          <View style={styles.pieCenter} />
        </View>
        <View style={styles.pieLegend}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <View style={styles.pieChart}>
        <View style={styles.pieContainer}>
          {data.map((item, index) => {
            if (item.value === 0) return null;
            
            const angle = (item.value / total) * 360;
            const rotation = currentAngle;
            currentAngle += angle;

            return (
              <View
                key={index}
                style={[
                  styles.pieSegment,
                  {
                    backgroundColor: item.color,
                    transform: [
                      { rotate: `${rotation}deg` },
                    ],
                  },
                ]}
              >
                <View style={[styles.pieSegmentInner, { transform: [{ rotate: `${angle}deg` }] }]} />
              </View>
            );
          })}
        </View>
        <View style={styles.pieCenter} />
      </View>
      
      <View style={styles.pieLegend}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              {item.name}: {((item.value / total) * 100).toFixed(1)}% ({item.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function AnalyticsReports() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sessions' | 'financial'>('overview');
  const { user } = useAuth();

  const API_BASE_URL = 'https://teleconnect-krga.onrender.com/api';

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // First get the main analytics data
      const analyticsResponse = await fetch(`${API_BASE_URL}/admin/analytics/?time_range=${timeRange}`, {
        headers: {
          'Authorization': `Token ${user?.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!analyticsResponse.ok) {
        throw new Error(`HTTP error! status: ${analyticsResponse.status}`);
      }
      
      const analyticsData = await analyticsResponse.json();

      // Get additional data from other endpoints
      const dashboardResponse = await fetch(`${API_BASE_URL}/admin/dashboard/stats/`, {
        headers: {
          'Authorization': `Token ${user?.token}`,
        },
      });

      const dashboardData = dashboardResponse.ok ? await dashboardResponse.json() : {};

      // Get revenue chart data
      const revenueResponse = await fetch(`${API_BASE_URL}/admin/dashboard/revenue-chart/`, {
        headers: {
          'Authorization': `Token ${user?.token}`,
        },
      });

      const revenueData = revenueResponse.ok ? await revenueResponse.json() : { labels: [], data: [] };

      // Combine all data
      const combinedData = {
        ...analyticsData,
        ...dashboardData,
        revenue_data: revenueData
      };

      setAnalytics(combinedData);
    } catch (error) {
      console.error('Analytics error:', error);
      Alert.alert('Error', 'Failed to load analytics data');
      setAnalytics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const renderStatCard = (title: string, value: string | number, subtitle: string, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderOverview = () => {
    if (!analytics) return null;

    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Revenue',
            `$${(analytics.total_revenue || analytics.financial_analytics?.total_revenue || 0).toLocaleString()}`,
            'All time revenue',
            '💰',
            '#34C759'
          )}
          {renderStatCard(
            'Active Users',
            (analytics.active_users || analytics.user_analytics?.active_users || 0).toLocaleString(),
            `${analytics.user_analytics?.active_rate || 0}% active rate`,
            '👥',
            '#007AFF'
          )}
          {renderStatCard(
            'Completed Sessions',
            (analytics.completed_sessions || analytics.session_analytics?.completed_sessions || 0).toLocaleString(),
            `${analytics.session_analytics?.completion_rate || 0}% completion rate`,
            '✅',
            '#5856D6'
          )}
          {renderStatCard(
            'Monthly Revenue',
            `$${(analytics.monthly_revenue || analytics.financial_analytics?.monthly_revenue || 0).toLocaleString()}`,
            'Current month',
            '📈',
            '#FF9500'
          )}
        </View>

        <Text style={styles.sectionTitle}>Revenue Trend</Text>
        {analytics.revenue_data && analytics.revenue_data.data && analytics.revenue_data.data.length > 0 ? (
          <LineChart
            data={analytics.revenue_data.data}
            labels={analytics.revenue_data.labels}
          />
        ) : (
          <View style={styles.chartContainer}>
            <Text style={styles.noDataText}>No revenue data available</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Session Types</Text>
        {analytics.session_analytics?.session_types ? (
          <PieChart
            data={[
              { name: 'Chat', value: analytics.session_analytics.session_types.chat, color: '#007AFF' },
              { name: 'Audio', value: analytics.session_analytics.session_types.audio, color: '#34C759' },
              { name: 'Video', value: analytics.session_analytics.session_types.video, color: '#FF9500' },
            ]}
          />
        ) : (
          <View style={styles.chartContainer}>
            <Text style={styles.noDataText}>No session type data available</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderUsersTab = () => {
    if (!analytics) return null;

    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>User Analytics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Users',
            (analytics.total_users || analytics.user_analytics?.total_users || 0).toLocaleString(),
            'All registered users',
            '👤',
            '#007AFF'
          )}
          {renderStatCard(
            'Active Users',
            (analytics.active_users || analytics.user_analytics?.active_users || 0).toLocaleString(),
            'Currently active',
            '✅',
            '#34C759'
          )}
          {renderStatCard(
            'New Users (7d)',
            (analytics.user_analytics?.new_users_7_days || 0).toLocaleString(),
            'Past 7 days',
            '🆕',
            '#FF9500'
          )}
          {renderStatCard(
            'Growth Rate',
            `${(analytics.user_analytics?.growth_percentage_30_days || analytics.monthly_growth || 0).toFixed(1)}%`,
            '30 days growth',
            '📈',
            '#5856D6'
          )}
        </View>

        <Text style={styles.sectionTitle}>User Distribution</Text>
        <BarChart
          data={[
            analytics.user_analytics?.active_users || 0,
            analytics.user_analytics?.inactive_users || 0,
          ]}
          labels={['Active', 'Inactive']}
          colors={['#34C759', '#FF3B30']}
        />

        <Text style={styles.sectionTitle}>User Activity</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'New Users (30d)',
            (analytics.user_analytics?.new_users_30_days || 0).toLocaleString(),
            'Past 30 days',
            '📅',
            '#AF52DE'
          )}
          {renderStatCard(
            'Active Rate',
            `${(analytics.user_analytics?.active_rate || 0).toFixed(1)}%`,
            'Percentage active',
            '📊',
            '#FF9500'
          )}
        </View>
      </ScrollView>
    );
  };

  const renderSessionsTab = () => {
    if (!analytics) return null;

    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Session Analytics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Sessions',
            (analytics.total_sessions || analytics.session_analytics?.total_sessions || 0).toLocaleString(),
            'All time sessions',
            '💬',
            '#007AFF'
          )}
          {renderStatCard(
            'Completed',
            (analytics.completed_sessions || analytics.session_analytics?.completed_sessions || 0).toLocaleString(),
            'Successfully completed',
            '✅',
            '#34C759'
          )}
          {renderStatCard(
            'Avg Duration',
            `${(analytics.session_analytics?.average_duration_minutes || 0).toFixed(1)}m`,
            'Average session length',
            '⏱️',
            '#FF9500'
          )}
          {renderStatCard(
            'Completion Rate',
            `${(analytics.session_analytics?.completion_rate || 0).toFixed(1)}%`,
            'Success rate',
            '📊',
            '#5856D6'
          )}
        </View>

        <Text style={styles.sectionTitle}>Session Types Distribution</Text>
        {analytics.session_analytics?.session_types ? (
          <BarChart
            data={[
              analytics.session_analytics.session_types.chat,
              analytics.session_analytics.session_types.audio,
              analytics.session_analytics.session_types.video,
            ]}
            labels={['Chat', 'Audio', 'Video']}
            colors={['#007AFF', '#34C759', '#FF9500']}
          />
        ) : (
          <View style={styles.chartContainer}>
            <Text style={styles.noDataText}>No session type data available</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Session Status</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Active Sessions',
            (analytics.active_sessions || analytics.session_analytics?.active_sessions || 0).toLocaleString(),
            'Currently active',
            '🟢',
            '#34C759'
          )}
          {renderStatCard(
            'Cancelled',
            (analytics.session_analytics?.cancelled_sessions || 0).toLocaleString(),
            'Cancelled sessions',
            '❌',
            '#FF3B30'
          )}
        </View>
      </ScrollView>
    );
  };

  const renderFinancialTab = () => {
    if (!analytics) return null;

    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Financial Analytics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Revenue',
            `$${(analytics.total_revenue || analytics.financial_analytics?.total_revenue || 0).toLocaleString()}`,
            'All time revenue',
            '💰',
            '#34C759'
          )}
          {renderStatCard(
            'Monthly Revenue',
            `$${(analytics.monthly_revenue || analytics.financial_analytics?.monthly_revenue || 0).toLocaleString()}`,
            'Current month',
            '📈',
            '#007AFF'
          )}
          {renderStatCard(
            'Weekly Revenue',
            `$${(analytics.financial_analytics?.weekly_revenue || 0).toLocaleString()}`,
            'Past 7 days',
            '📅',
            '#FF9500'
          )}
          {renderStatCard(
            'Avg Transaction',
            `$${(analytics.average_session_value || analytics.financial_analytics?.average_transaction_value || 0).toFixed(2)}`,
            'Average value',
            '💳',
            '#5856D6'
          )}
        </View>

        <Text style={styles.sectionTitle}>Payment Status</Text>
        {analytics.financial_analytics?.payment_status ? (
          <PieChart
            data={[
              { name: 'Completed', value: analytics.financial_analytics.payment_status.completed, color: '#34C759' },
              { name: 'Pending', value: analytics.financial_analytics.payment_status.pending, color: '#FF9500' },
              { name: 'Failed', value: analytics.financial_analytics.payment_status.failed, color: '#FF3B30' },
            ]}
          />
        ) : (
          <View style={styles.chartContainer}>
            <Text style={styles.noDataText}>No payment status data available</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
        {analytics.revenue_data && analytics.revenue_data.data && analytics.revenue_data.data.length > 0 ? (
          <BarChart
            data={analytics.revenue_data.data}
            labels={analytics.revenue_data.labels}
            colors={['#007AFF', '#34C759', '#FF9500', '#5856D6', '#AF52DE', '#FF3B30']}
          />
        ) : (
          <View style={styles.chartContainer}>
            <Text style={styles.noDataText}>No revenue breakdown data available</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  if (loading && !analytics) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="stats-chart-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No analytics data available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics & Reports</Text>
        <View style={styles.timeRangeSelector}>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === '7d' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('7d')}
          >
            <Text style={[styles.timeRangeText, timeRange === '7d' && styles.timeRangeTextActive]}>
              7D
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === '30d' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('30d')}
          >
            <Text style={[styles.timeRangeText, timeRange === '30d' && styles.timeRangeTextActive]}>
              30D
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === '90d' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('90d')}
          >
            <Text style={[styles.timeRangeText, timeRange === '90d' && styles.timeRangeTextActive]}>
              90D
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sessions' && styles.tabActive]}
            onPress={() => setActiveTab('sessions')}
          >
            <Text style={[styles.tabText, activeTab === 'sessions' && styles.tabTextActive]}>
              Sessions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'financial' && styles.tabActive]}
            onPress={() => setActiveTab('financial')}
          >
            <Text style={[styles.tabText, activeTab === 'financial' && styles.tabTextActive]}>
              Financial
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'sessions' && renderSessionsTab()}
      {activeTab === 'financial' && renderFinancialTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  timeRangeSelector: {
    flexDirection: 'row',
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    marginRight: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timeRangeTextActive: {
    color: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabScroll: {
    paddingHorizontal: 15,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  // Bar Chart Styles
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 180,
    paddingHorizontal: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barLabelContainer: {
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    width: 30,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  barValueContainer: {
    marginTop: 4,
  },
  barValue: {
    fontSize: 10,
    color: '#333',
    fontWeight: '600',
  },
  // Line Chart Styles
  lineChart: {
    width: '100%',
    position: 'relative',
  },
	gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  linePath: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#007AFF',
    transformOrigin: 'left center',
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 160,
    paddingHorizontal: 10,
  },
  lineLabel: {
    fontSize: 10,
    color: '#666',
    transform: [{ rotate: '-45deg' }],
  },
  // Pie Chart Styles
  pieChart: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    position: 'relative',
  },
  pieContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
    overflow: 'hidden',
  },
  pieSegment: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  pieSegmentInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
    transformOrigin: 'left center',
  },
  pieCenter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  pieLegend: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});