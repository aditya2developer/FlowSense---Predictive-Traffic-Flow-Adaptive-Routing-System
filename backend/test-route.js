const getRoute = require("./utils/route");

async function test() {
  try {
    const result = await getRoute(
      31.3312228,
      75.5907178,
      31.2533133,
      75.7032788
    );

    console.log("Number of routes:", result.routes.length);

    result.routes.forEach((route, index) => {
      console.log(`\nRoute ${index + 1}`);

      console.log(
        "Distance:",
        (route.distance / 1000).toFixed(2),
        "km"
      );

      console.log(
        "Travel time:",
        Math.round(route.duration / 60),
        "minutes"
      );
    });
  } catch (error) {
    console.error("Routing error:", error.message);
  }
}

test();