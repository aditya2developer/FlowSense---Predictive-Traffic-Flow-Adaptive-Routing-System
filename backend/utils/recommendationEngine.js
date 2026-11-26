/**
 * FlowSense AI Recommendation Engine
 * Generates context-aware, actionable recommendations for commuters and traffic police.
 */

function generateRecommendations(type, severity, roadName = "the corridor", city = "the city") {
  let driverRecommendation;
  let policeActionPlan;

  switch (type) {
    case "ACCIDENT":
      if (severity === "CRITICAL" || severity === "HIGH") {
        driverRecommendation = `🚨 EMERGENCY: Severe multi-vehicle collision on ${roadName}. All civilian traffic should divert via adjacent ring road/arterials immediately. Do not rubberneck; keep emergency shoulder clear for ambulances.`;
        policeActionPlan = `1. Dispatch Patrol Unit & 108 Emergency Medical Services. 2. Establish traffic cordon 500m prior to impact zone. 3. Preempt traffic signals green for incoming trauma ambulance. 4. Request heavy-duty hydraulic wrecker.`;
      } else {
        driverRecommendation = `⚠️ Minor fender collision on ${roadName}. Reduce speed to 30 km/h, merge into free lanes early, and maintain safe stopping distance.`;
        policeActionPlan = `1. Direct involved motorists to move vehicles to shoulder to prevent rubberneck delay. 2. Quick photographic evidence capture & e-challan report. 3. Clear debris within 10 minutes.`;
      }
      break;

    case "FLOOD":
      driverRecommendation = `🌊 Severe waterlogging reported on ${roadName} in ${city}. Low-slung sedans and two-wheelers must avoid underpasses. Drive in lower gear (1st or 2nd) with steady engine revs; never restart an engine stalled in deep water.`;
      policeActionPlan = `1. Deploy emergency submersible dewatering pumps via Municipal Corporation / BBMP / NDMC. 2. Erect reflective warning barricades at submerged sections. 3. Divert heavy buses and light vehicles to elevated corridors.`;
      break;

    case "ROADBLOCK":
      driverRecommendation = `🛑 Full road obstruction / closure on ${roadName}. Route is impassable. Follow FlowSense suggested detour or use public transit / Metro alternatives.`;
      policeActionPlan = `1. Station interceptor vehicle at preceding major roundabout / intersection. 2. Broadcast live variable message sign (VMS) detour. 3. Recalibrate downstream signal cycle time by +20s.`;
      break;

    case "TRAFFIC_JAM":
      driverRecommendation = `🚗 Severe gridlock on ${roadName}. Average speed dropped under 12 km/h. If departure can be delayed by 25–40 minutes, do so; otherwise switch to parallel arterial.`;
      policeActionPlan = `1. Deploy manual traffic officer at bottleneck choke-point. 2. Clear illegal curb parking and bottleneck loading autos/cabs. 3. Extend green phase for primary arterial.`;
      break;

    case "CONSTRUCTION":
      driverRecommendation = `🚧 Active road work & lane restriction on ${roadName}. Speed limit enforced at 30 km/h. Watch for heavy machinery and workers; merge into single file early.`;
      policeActionPlan = `1. Verify contractor compliant with high-visibility reflective cones and warning signage. 2. Restrict heavy goods vehicles (HGV) between 08:00–11:00 and 17:00–21:00.`;
      break;

    case "POTHOLE":
      driverRecommendation = `🕳️ Hazardous crater / road surface damage on ${roadName}. Two-wheelers exercise extreme caution, especially at night or during rainfall. Do not swerve abruptly into adjacent lanes.`;
      policeActionPlan = `1. Mark hazardous crater with high-vis reflective paint / temporary hazard cone. 2. Issue priority emergency road repair ticket to PWD / NHAI Highway Maintenance Wing.`;
      break;

    case "FIRE_HAZARD":
      driverRecommendation = `🔥 Active vehicle or roadside fire hazard on ${roadName}. Roll up windows, switch AC to internal circulation, and do not attempt to drive through smoke plumes. Yield right of way to fire tenders.`;
      policeActionPlan = `1. Immediate 200m perimeter lockdown in coordination with Fire Services. 2. Clear primary arterial for fire truck ingress. 3. Evacuate nearby stranded vehicles.`;
      break;

    case "STALLED_VEHICLE":
    case "BREAKDOWN":
      driverRecommendation = `🚙 Stalled breakdown vehicle obstructing carriage lane on ${roadName}. Move into outer lane and look out for stranded passengers standing near shoulder.`;
      policeActionPlan = `1. Dispatch traffic towing crane immediately. 2. Place safety warning triangles 50m behind vehicle. 3. Restore lane capacity within 15 minutes.`;
      break;

    case "DEBRIS":
      driverRecommendation = `⚠️ Dangerous debris / fallen tree / spilled cargo on ${roadName}. Reduce driving speed, avoid sudden braking, and switch on low beams.`;
      policeActionPlan = `1. Deploy road maintenance flying squad with chainsaw / clearing equipment. 2. Slow approaching traffic using flare / LED baton control.`;
      break;

    default:
      driverRecommendation = `⚠️ Traffic hazard reported on ${roadName}. Exercise caution, adhere to posted speed limits, and anticipate unpredictable slowdowns.`;
      policeActionPlan = `1. Nearest patrol bike to verify hazard coordinates. 2. Assess threat level and update FlowSense status to RESOLVED once cleared.`;
  }

  return {
    driverRecommendation,
    policeActionPlan
  };
}

module.exports = generateRecommendations;
