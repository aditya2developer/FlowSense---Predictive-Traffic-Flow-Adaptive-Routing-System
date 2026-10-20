function RouteCard({ route }) {

  return (
    <div
      className={`route-card ${
        route.recommended ? "recommended" : ""
      }`}
    >

      <div className="route-header">

        <h3>
          {route.recommended && "⭐ "}
          {route.name}
        </h3>

        {route.recommended && (
          <span className="recommended-badge">
            Recommended
          </span>
        )}

      </div>


      <div className="route-details">

        <div>
          <span>Distance</span>
          <strong>
            {route.distance} km
          </strong>
        </div>


        <div>
          <span>Current Time</span>
          <strong>
            {route.currentTime} min
          </strong>
        </div>


        <div>
          <span>Predicted Time</span>
          <strong>
            {route.predictedTime} min
          </strong>
        </div>


        <div>
          <span>Congestion</span>
          <strong>
            {route.congestion}
          </strong>
        </div>


        <div>
          <span>Stability</span>
          <strong>
            {route.stabilityScore}/100
          </strong>
        </div>

      </div>


      <div className="route-message">

        {route.message}

      </div>

    </div>
  );
}

export default RouteCard;