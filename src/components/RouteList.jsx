import RouteCard from "./RouteCard";

function RouteList({ routes }) {

  if (!routes || routes.length === 0) {
    return null;
  }

  return (
    <section className="route-section">

      <h2>Available Routes</h2>

      {routes.map((route) => (

        <RouteCard
          key={route.id}
          route={route}
        />

      ))}

    </section>
  );
}

export default RouteList;