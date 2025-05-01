#pragma once

class SimCom;
class DeviceServer;
class DeviceManager;
class LocalAircraft;
class AirplaneRadar;
class RealTimeThread;

namespace GlobalScope
{
	SimCom& GetSimCom();
	DeviceServer& GetDeviceServer();
	DeviceManager& GetDeviceManager();
	LocalAircraft& GetLocalAircraft();
	AirplaneRadar& GetAirplaneRadar();
	RealTimeThread& GetRealTimeThread();
}
