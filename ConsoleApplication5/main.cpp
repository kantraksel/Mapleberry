#include <iostream>
#include <string>
#include "SimCom/SimCom.h"
#include "DeviceServer/DeviceServer.h"
#include "App/RealTimeThread.h"
#include "App/DeviceManager.h"
#include "App/LocalAircraft.h"
#include "App/AirplaneRadar.h"
#include "App/GlobalScope.h"
#include "WebCast/WebCast.hpp"
#include "WebCast/WebDriver.hpp"
#include "Utils/Logger.h"
#include "Utils/version.h"

static bool GetArguments(const std::string& line, std::string_view& cmd, std::string_view& args)
{
	auto i = line.find(' ');
	if (i != line.npos && i > 0 && i < (line.size() - 1))
	{
		cmd = std::string_view(line.data(), i - 1);
		args = std::string_view(line.data() + i + 1);
		return true;
	}
	else
	{
		Logger::LogError("No argument!");
		return false;
	}
}

static void CommandLoop()
{
	auto& thread = GlobalScope::GetRealTimeThread();
	auto& deviceServer = GlobalScope::GetDeviceServer();
	auto& deviceManager = GlobalScope::GetDeviceManager();

	std::string line;
	while (std::getline(std::cin, line))
	{
		if (line.empty())
			continue;

		if (line.starts_with("stop") || line.starts_with("exit") || line.starts_with("quit"))
			return;
		else if (line.starts_with("kickall"))
		{
			auto lock = thread.EnterCmdMode();
			deviceServer.KickAll();
		}
		else if (line.starts_with("help"))
		{
			Logger::Log("Available commands:");
			Logger::Log(" - stop - stops app");
			Logger::Log(" - kickall - kicks all clients");
			Logger::Log(" - kick <id> - kicks the client");
			Logger::Log(" - status - prints slot status");
			Logger::Log(" - device <subcmd> - sends message to connected devices");
		}
		else if (line.starts_with("status"))
		{
			auto lock = thread.EnterCmdMode();
			deviceServer.PrintStatus();
		}
		else if (line.starts_with("kick"))
		{
			std::string_view cmd, args;
			if (!GetArguments(line, cmd, args))
				continue;
			
			unsigned int id = 0;
			try
			{
				id = std::stoul(std::string(args));
			}
			catch (const std::exception& e)
			{
				Logger::LogError(e.what());
				continue;
			}

			auto lock = thread.EnterCmdMode();
			deviceServer.Kick(id);
		}
		else if (line.starts_with("device"))
		{
			std::string_view cmd, args;
			if (!GetArguments(line, cmd, args))
				continue;

			if (args.starts_with("dev"))
			{
				auto lock = thread.EnterCmdMode();
				deviceManager.RebootIntoDevMode();
			}
		}
	}
}

int main()
{
	auto& thread = GlobalScope::GetRealTimeThread();
	auto& webcast = GlobalScope::GetWebCast();
	auto& webdriver = GlobalScope::GetWebDriver();

	Logger::DisableTimestamp();
	Logger::Log(Version::Title);

	webdriver.Initialize();
	webcast.Start();
	thread.Start();

	CommandLoop();
	
	thread.Stop();
	webcast.Stop();
	webcast.Wait();
	thread.Wait();
}
