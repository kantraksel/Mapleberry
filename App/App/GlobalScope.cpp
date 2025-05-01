#include "GlobalScope.h"
#include "SimCom/SimCom.h"
#include "DeviceServer/DeviceServer.h"
#include "App/DeviceManager.h"
#include "App/LocalAircraft.h"
#include "App/AirplaneRadar.h"
#include "App/RealTimeThread.h"

SimCom simcom;
DeviceServer deviceServer;
DeviceManager deviceManager;
LocalAircraft aircraft;
AirplaneRadar radar;
RealTimeThread thread;

SimCom& GlobalScope::GetSimCom()
{
	return simcom;
}

DeviceServer& GlobalScope::GetDeviceServer()
{
	return deviceServer;
}

DeviceManager& GlobalScope::GetDeviceManager()
{
	return deviceManager;
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
