import RouteCard from "./RouteCard";

function RouteList({ routes, selectedRouteId, onSelectRoute }) {
  if (!routes || routes.length === 0) {
    return null;
  }

  return (
    <section className="route-section">
      <div className="route-list-header">
        <h2>Available Routes ({routes.length})</h2>
        <span className="route-subhint">Ranked by Predictive Stability Score</span>
      </div>

      <div className="routes-cards-stack">
        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={selectedRouteId === route.id}
            onSelect={onSelectRoute}
          />
        ))}
      </div>
    </section>
  );
}

export default RouteList;
