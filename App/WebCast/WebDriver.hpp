#pragma once
#include "TrafficRadar/AirplaneRadar.h"
#include "TrafficRadar/LocalAircraft.h"
#include "Utils/FixedArray.h"

class WebDriver
{
private:
	void OnRadarAdd(const AirplaneRadar::PlaneAddArgs&);
	void OnRadarRemove(const AirplaneRadar::PlaneRemoveArgs&);
	void OnRadarUpdate(const AirplaneRadar::PlaneUpdateArgs&);
	void OnUserAdd(const LocalAircraft::PlaneAddArgs&);
	void OnUserRemove();
	void OnUserUpdate(const LocalAircraft::PlaneUpdateArgs&);
	void OnRequestSendAllData(const FixedArrayCharS&);
	void OnRequestModifySystemState(const FixedArrayCharS&);
	void OnRequestModifySystemProperties(const FixedArrayCharS&);

public:
	WebDriver();
	~WebDriver();

	void Initialize();
	void OnSimConnect();
	void OnSimDisconnect();
};
