#pragma once

class SimCom;
class LocalAircraft;
class AirplaneRadar;
class RealTimeThread;
class WebCast;
class WebDriver;

namespace GlobalScope
{
	SimCom& GetSimCom();
	LocalAircraft& GetLocalAircraft();
	AirplaneRadar& GetAirplaneRadar();
	RealTimeThread& GetRealTimeThread();
	WebCast& GetWebCast();
	WebDriver& GetWebDriver();
}
