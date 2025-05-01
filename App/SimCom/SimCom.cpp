#include "SimCom.h"
#include "Utils/Time.h"
#include "Utils/version.h"
#include "Utils/Logger.h"

SimCom::SimCom() : nextReconnect(0), isConnected(false)
{
}

SimCom::~SimCom()
{
}

bool SimCom::Initialize()
{
	if (!simconnect.Initialize(Version::SimConnectName))
	{
		nextReconnect = Time::SteadyNowInt() + 60 * 1000;
		return false;
	}
	nextReconnect = Time::SteadyNowInt() + 5 * 60 * 1000;

	simconnect.SetConnectCallback([&](const SimConnect::EventServer& event)
		{
			appName = event.appName;

			bool connected = isConnected;
			isConnected = true;
			if (!connected)
			{
				Logger::Log("Connected to {} {}.{}", event.appName, event.appVersionMajor, event.appVersionMinor);
				OnConnect();
			}
		});

	simconnect.SetDisconnectCallback([&]()
		{
			OnDisconnected();
		});

	simconnect.SetExceptionCallback([](const SimConnect::EventException& event)
		{
			Logger::LogError("SimConnect Exception: {} {} argument {:X}", event.exception, event.exceptionName, event.argId);
		});
	return true;
}

void SimCom::Shutdown()
{
	simconnect.Shutdown();
	OnDisconnected();
}

void SimCom::RunCallbacks()
{
	if (!isConnected && nextReconnect <= Time::SteadyNowInt())
		Initialize();

	while (simconnect.RunCallbacks());
}

void SimCom::OnDisconnected()
{
	nextReconnect = Time::SteadyNowInt() + 60 * 1000;

	bool connected = isConnected;
	isConnected = false;
	if (connected)
	{
		Logger::Log("Disconnected from simulator");
		OnDisconnect();
	}
}
