function TrafficHeatmap({ analytics }) {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const hours = [
    ...new Set(analytics.map((item) => Number(item.hour))),
  ].sort((a, b) => a - b);

  function getCongestion(day, hour) {
    return analytics.find(
      (item) =>
        item.dayOfWeek === day &&
        Number(item.hour) === hour
    );
  }

  function getColor(percentage) {
    if (percentage >= 70) return "#ef4444";
    if (percentage >= 30) return "#f59e0b";
    return "#22c55e";
  }

  return (
    <section className="traffic-heatmap">
      <h2>Traffic Congestion Heatmap</h2>

      <p>
        Explore historical high-congestion percentages by day and hour.
        Gray cells indicate that no historical data is available.
      </p>

      {hours.length === 0 ? (
        <p>No traffic data available to build the heatmap.</p>
      ) : (
        <div className="heatmap-wrapper">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th>Day</th>

                {hours.map((hour) => (
                  <th key={hour}>
                    {String(hour).padStart(2, "0")}:00
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <th>{day}</th>

                  {hours.map((hour) => {
                    const record = getCongestion(day, hour);
                    const percentage = record?.highCongestionPercentage;

                    return (
                      <td key={`${day}-${hour}`}>
                        <div
                          className="heatmap-cell"
                          style={{
                            backgroundColor:
                              record == null
                                ? "#e5e7eb"
                                : getColor(percentage),
                          }}
                          title={
                            record == null
                              ? `${day}, ${hour}:00 — No data`
                              : `${day}, ${hour}:00 — ${percentage}% high congestion`
                          }
                        >
                          {record == null ? "—" : `${percentage}%`}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="heatmap-legend">
        <span><i className="legend-low" /> Low: 0–29%</span>
        <span><i className="legend-medium" /> Medium: 30–69%</span>
        <span><i className="legend-high" /> High: 70–100%</span>
        <span><i className="legend-empty" /> No data</span>
      </div>
    </section>
  );
}

export default TrafficHeatmap;