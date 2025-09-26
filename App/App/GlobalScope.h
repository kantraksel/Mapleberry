#pragma once

class SimCom;
class DeviceServer;
class DeviceManager;
class LocalAircraft;
class AirplaneRadar;
class RealTimeThread;
class WebCast;
class WebDriver;

namespace GlobalScope
{
	SimCom& GetSimCom();
	DeviceServer& GetDeviceServer();
	DeviceManager& GetDeviceManager();
	LocalAircraft& GetLocalAircraft();
	AirplaneRadar& GetAirplaneRadar();
	RealTimeThread& GetRealTimeThread();
	WebCast& GetWebCast();
	WebDriver& GetWebDriver();
}
