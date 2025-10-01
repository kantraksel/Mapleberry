#include "GlobalScope.h"
#include "SimCom/SimCom.h"
#include "App/LocalAircraft.h"
#include "App/AirplaneRadar.h"
#include "App/RealTimeThread.h"
#include "WebCast/WebCast.hpp"
#include "WebCast/WebDriver.hpp"

SimCom simcom;
LocalAircraft aircraft;
AirplaneRadar radar;
RealTimeThread thread;
WebCast webcast;
WebDriver webdriver;

SimCom& GlobalScope::GetSimCom()
{
	return simcom;
}

LocalAircraft& GlobalScope::GetLocalAircraft()
{
	return aircraft;
}

AirplaneRadar& GlobalScope::GetAirplaneRadar()
{
	return radar;
}

RealTimeThread& GlobalScope::GetRealTimeThread()
{
	return thread;
}

WebCast& GlobalScope::GetWebCast()
{
	return webcast;
}

WebDriver& GlobalScope::GetWebDriver()
{
	return webdriver;
}
