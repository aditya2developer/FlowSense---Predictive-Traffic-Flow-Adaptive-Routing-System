const geocodeLocation = require("./utils/geocode");

async function test() {
  try {
    // const result = await geocodeLocation(
    //   "Jalandhar Railway Station, Punjab, India"
    // );
    const result = await geocodeLocation(
  "Lovely Professional University, Punjab, India"
);

    console.log(result);
  } catch (error) {
    console.error(error.message);
  }
}

test();