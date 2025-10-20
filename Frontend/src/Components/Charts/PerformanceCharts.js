import React from 'react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

// Performance Line Chart Component
export const PerformanceLineChart = ({ data, title = "Performance Progress", isDarkMode = false }) => {
  return (
    <div className="card chart-card">
      <div className="chart-container">
        <h2 className="chart-title">{title}</h2>
        <div className="chart-content">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#475569" : "#e5e7eb"} />
              <XAxis
                dataKey="session"
                label={{
                  value: 'Session',
                  position: 'insideBottom',
                  offset: -5
                }}
                stroke={isDarkMode ? "#94a3b8" : "#6b7280"}
              />
              <YAxis
                domain={[0, 100]}
                label={{
                  value: 'Score',
                  angle: -90,
                  position: 'insideLeft'
                }}
                stroke={isDarkMode ? "#94a3b8" : "#6b7280"}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Score']}
                labelFormatter={(session) => `Session ${session}`}
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  borderColor: isDarkMode ? '#334155' : '#e5e7eb',
                  color: isDarkMode ? '#e2e8f0' : '#374151'
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={3}
                activeDot={{ r: 8 }}
                dot={{
                  stroke: '#3b82f6',
                  strokeWidth: 2,
                  r: 6,
                  fill: isDarkMode ? '#1e293b' : '#ffffff'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Performance Breakdown Pie Chart Component
export const PerformancePieChart = ({ data, overallScore, title = "Performance Breakdown", isDarkMode = false }) => {
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
  
  return (
    <div className="card chart-card">
      <div className="chart-container">
        <h2 className="chart-title">{title}</h2>
        <div className="chart-content">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                outerRadius={80}
                innerRadius={60}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="pie-chart-grade"
              >
                {overallScore}%
              </text>
              <text
                x="50%"
                y="62%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="pie-chart-label"
              >
                Overall
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Category Performance Chart Component (for category breakdowns)
export const CategoryPerformanceChart = ({ data, title = "Category Performance", isDarkMode = false }) => {
  // Get all unique category keys from the data
  const categoryKeys = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'session') : [];
  
  // Define colors for the categories
  const colors = {
    verbal: "#3b82f6",
    body_language: "#10b981", 
    interaction: "#f59e0b",
    // Fallback colors for any other categories
    nonverbal: "#10b981",
    engagement: "#f59e0b"
  };

  const processedData = data.map((item, index) => ({
    session: index + 1,
    ...item
  }));

  return (
    <div className="card chart-card">
      <div className="chart-container">
        <h2 className="chart-title">{title}</h2>
        <div className="chart-content">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#475569" : "#e5e7eb"} />
              <XAxis
                dataKey="session"
                label={{
                  value: 'Session',
                  position: 'insideBottom',
                  offset: -5
                }}
                stroke={isDarkMode ? "#94a3b8" : "#6b7280"}
              />
              <YAxis
                domain={[0, 100]}
                label={{
                  value: 'Score',
                  angle: -90,
                  position: 'insideLeft'
                }}
                stroke={isDarkMode ? "#94a3b8" : "#6b7280"}
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())]}
                labelFormatter={(session) => `Session ${session}`}
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  borderColor: isDarkMode ? '#334155' : '#e5e7eb',
                  color: isDarkMode ? '#e2e8f0' : '#374151'
                }}
              />
              {categoryKeys.map((category) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={colors[category] || "#6b7280"}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
