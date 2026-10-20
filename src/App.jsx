import { useState } from "react";

import MapView from "./components/MapView";
import Navbar from "./components/Navbar";
import SearchBox from "./components/SearchBox";
import RouteList from "./components/RouteList";
import TrafficAnalytics from "./components/TrafficAnalytics";

import "./App.css";


function App() {

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // const [routes, setRoutes] = useState([]);
  const [routes, setRoutes] = useState([]);
const [locations, setLocations] = useState(null);


  async function handleSearch() {

    if (!from.trim() || !to.trim()) {

      alert("Please enter both locations.");

      return;
    }


    try {

      const response = await fetch(
        "http://localhost:5000/api/routes/search",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            from: from,
            to: to
          })
        }
      );


      const data = await response.json();


      console.log("Backend response:", data);


      if (data.success) {
  setRoutes(data.routes);

  setLocations({
    from: data.from,
    to: data.to
  });

      } else {

        alert(data.message);

      }

    } catch (error) {

      console.error("Backend connection error:", error);

      alert("Unable to connect to FlowSense backend.");

    }
  }


  return (

    <div className="app">

      <Navbar />


      <main className="main">

        <section className="hero">

          <h1>
            Find the Best Route
          </h1>

          <p>
            Predict traffic, avoid congestion,
            and reach your destination smarter.
          </p>

        </section>


        <SearchBox
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          onSearch={handleSearch}
        />


        <div className="results-layout">

          <MapView
  routes={routes}
  locations={locations}
/>

          <RouteList
            routes={routes}
          />
          <TrafficAnalytics />
        </div>

      </main>

    </div>

  );
}


export default App;