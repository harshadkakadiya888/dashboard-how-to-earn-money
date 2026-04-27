import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ViewsChart({ data }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-4">📊 Post Views</h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />

          <XAxis type="number" hide />

          <YAxis
            dataKey="label"
            type="category"
            width={180}
            tick={{
              fontSize: 12,
              fill: "#555",
            }}
          />

          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              background: "#fff",
              boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
            }}
          />

          <Bar
            dataKey="views"
            radius={[12, 12, 12, 12]}
            barSize={20}
            fill="url(#gradient)"
          />

          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}