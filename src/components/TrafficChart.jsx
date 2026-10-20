import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar
} from "recharts";

function TrafficChart({ analytics }) {
  if (!analytics || analytics.length === 0) {
    return null;
  }

  const chartData = [...analytics]
    .sort((a, b) => a.hour - b.hour)
    .map((item) => ({
      time: `${String(item.hour).padStart(2, "0")}:00`,
      vehicles: item.averageVehicleCount,
      speed: item.averageSpeed,
      congestion: item.highCongestionPercentage
    }));

  return (
    <section className="traffic-chart-card">
      <h2>Traffic Trends</h2>
      <p>Compare historical vehicle counts and average speeds by hour.</p>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="time" />

          <YAxis
            yAxisId="vehicles"
            orientation="left"
            label={{
              value: "Vehicles",
              angle: -90,
              position: "insideLeft"
            }}
          />

          <YAxis
            yAxisId="speed"
            orientation="right"
            label={{
              value: "Speed (km/h)",
              angle: 90,
              position: "insideRight"
            }}
          />

          <Tooltip />
          <Legend />

          <Bar
            yAxisId="vehicles"
            dataKey="vehicles"
            name="Average Vehicles"
            fill="#3b82f6"
          />

          <Line
            yAxisId="speed"
            type="monotone"
            dataKey="speed"
            name="Average Speed (km/h)"
            stroke="#16a34a"
            strokeWidth={3}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}

export default TrafficChart;