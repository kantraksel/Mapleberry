#include <iostream>
#include <string>
#include "SimCom/SimCom.h"
#include "App/RealTimeThread.h"
#include "TrafficRadar/LocalAircraft.h"
#include "TrafficRadar/AirplaneRadar.h"
#include "WebCast/WebCast.hpp"
#include "WebCast/WebDriver.hpp"
#include "Utils/Logger.h"
#include "Utils/version.h"

SimCom simcom;
LocalAircraft aircraft;
AirplaneRadar radar;
RealTimeThread thread;
WebCast webcast;
WebDriver webdriver;

static void OnTick()
{
	simcom.RunCallbacks();
	radar.OnUpdate();
}

static void OnSimConnect()
{
	radar.Initialize();
	/*
	auto& simconnect = simcom.GetSimConnect();

	simconnect.SubscribeToSimStart([]()
		{
			Logger::Log("SimStart");
		});
	simconnect.SubscribeToSimStop([]()
		{
			Logger::Log("SimStop");
		});
	simconnect.SubscribeToPause([](bool paused)
		{
			Logger::Log("Paused: {}", paused);
		});
	*/
	webdriver.OnSimConnect();
}

static void OnSimDisconnect()
{
	webdriver.OnSimDisconnect();
	radar.Shutdown();
}

static void GetArguments(const std::string& line, std::string_view& cmd, std::string_view& args)
{
	auto i = line.find(' ');
	if (i != line.npos && i > 0 && i < (line.size() - 1))
	{
		cmd = std::string_view(line.data(), i);
		args = std::string_view(line.data() + i + 1);
	}
	else
		cmd = line;
}

static void CommandLoop()
{
	std::string line;
	while (std::getline(std::cin, line))
	{
		if (line.empty())
			continue;

		std::string_view cmd, args;
		GetArguments(line, cmd, args);

		if (cmd == "stop" || cmd == "exit" || cmd == "quit")
			return;
		else if (cmd == "help")
		{
			Logger::Log("Available commands:");
			Logger::Log(" - stop - stops app");
		}
	}
}

int main()
{
	simcom.OnConnect = &OnSimConnect;
	simcom.OnDisconnect = &OnSimDisconnect;

	Logger::DisableTimestamp();
	Logger::Log(Version::Title);

	webdriver.Initialize();
	webcast.Start();
	thread.Start();

	CommandLoop();
	
	thread.Stop();
	thread.Wait();
	simcom.Shutdown();
}
